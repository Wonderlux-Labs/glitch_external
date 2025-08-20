// Enhanced data management for external cube tracker
// Includes localStorage persistence, smart refresh intervals, and offline resilience

window.MapData = {
  // Configuration
  config: {
    // Update intervals (in milliseconds)
    normalInterval: 5 * 60 * 1000,      // 5 minutes when API is working
    slowInterval: 30 * 60 * 1000,       // 30 minutes when API is struggling
    offlineInterval: 60 * 60 * 1000,    // 1 hour when completely offline
    
    // Retry configuration
    maxRetries: 3,
    retryBackoffMs: 5000,               // Start with 5 second backoff
    
    // Storage configuration
    storageKey: 'glitchcube_cache',
    maxHistoryItems: 100,
    
    // Data staleness thresholds
    staleThresholdMs: 10 * 60 * 1000,   // 10 minutes
    expiredThresholdMs: 24 * 60 * 60 * 1000  // 24 hours
  },
  
  // Runtime state
  state: {
    currentInterval: null,
    updateTimer: null,
    retryCount: 0,
    lastSuccessfulFetch: null,
    consecutiveFailures: 0,
    isStaticMode: false
  },

  cache: {
    lastLocation: null,
    locationHistory: [],
    lastUpdate: null,
    apiStatus: 'connecting'
  },
  
  callbacks: {
    onLocationUpdate: [],
    onStatusChange: [],
    onError: []
  },
  
  // Initialize the data manager
  initialize: function() {
    MapUtils.log('🎲 Initializing enhanced MapData...');
    
    // Check if we're in static mode
    this.state.isStaticMode = window.STATIC_MODE || false;
    
    if (this.state.isStaticMode) {
      this.initializeStaticMode();
    } else {
      this.initializeDynamicMode();
    }
    
    // Load persisted data
    this.loadFromStorage();
    
    MapUtils.log(`✅ MapData initialized (${this.state.isStaticMode ? 'static' : 'dynamic'} mode)`);
  },
  
  // Initialize static mode (GitHub Pages)
  initializeStaticMode: function() {
    MapUtils.log('📡 Initializing static mode...');
    
    // Load injected static data
    if (window.CUBE_LOCATION) {
      this.handleLocationUpdate(window.CUBE_LOCATION, 'static');
    }
    
    // Set static status
    this.setApiStatus('static');
    
    // Save the static data to localStorage for future offline use
    this.saveToStorage();
  },
  
  // Initialize dynamic mode (Sinatra app)
  initializeDynamicMode: function() {
    MapUtils.log('🔄 Initializing dynamic mode...');
    
    // Start with normal interval
    this.state.currentInterval = this.config.normalInterval;
    
    // Begin periodic updates
    this.startSmartUpdates();
  },
  
  // Register callback functions
  onLocationUpdate: function(callback) {
    this.callbacks.onLocationUpdate.push(callback);
  },
  
  onStatusChange: function(callback) {
    this.callbacks.onStatusChange.push(callback);
  },
  
  onError: function(callback) {
    this.callbacks.onError.push(callback);
  },
  
  // Smart update system with adaptive intervals
  startSmartUpdates: function() {
    if (this.state.isStaticMode) {
      MapUtils.log('⚠️ Smart updates disabled in static mode');
      return;
    }
    
    this.stopUpdates(); // Clear any existing timer
    
    MapUtils.log(`🔄 Starting smart updates (interval: ${this.state.currentInterval / 1000}s)`);
    
    // Initial fetch
    this.fetchCubeLocation();
    
    // Set up adaptive timer
    this.state.updateTimer = setInterval(() => {
      this.fetchCubeLocation();
    }, this.state.currentInterval);
  },
  
  // Stop all updates
  stopUpdates: function() {
    if (this.state.updateTimer) {
      clearInterval(this.state.updateTimer);
      this.state.updateTimer = null;
      MapUtils.log('🛑 Updates stopped');
    }
  },
  
  // Fetch current cube location from API with retry logic
  fetchCubeLocation: function() {
    if (this.state.isStaticMode) {
      MapUtils.log('⚠️ API fetch disabled in static mode');
      return;
    }
    
    MapUtils.log(`🌐 Fetching cube location (attempt ${this.state.retryCount + 1}/${this.config.maxRetries})...`);
    
    this.setApiStatus('loading');
    
    fetch('/api/cube_location')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        this.handleSuccessfulFetch(data);
      })
      .catch(error => {
        this.handleFailedFetch(error);
      });
  },
  
  // Handle successful API response
  handleSuccessfulFetch: function(data) {
    // Reset failure tracking
    this.state.consecutiveFailures = 0;
    this.state.retryCount = 0;
    this.state.lastSuccessfulFetch = new Date();
    
    // Process the location data
    this.handleLocationUpdate(data, 'api');
    
    // Adjust update interval back to normal if needed
    if (this.state.currentInterval !== this.config.normalInterval) {
      this.state.currentInterval = this.config.normalInterval;
      this.startSmartUpdates(); // Restart with new interval
    }
    
    // Save successful data
    this.saveToStorage();
  },
  
  // Handle failed API response with smart retry
  handleFailedFetch: function(error) {
    this.state.consecutiveFailures++;
    this.state.retryCount++;
    
    MapUtils.error(`❌ API fetch failed (${this.state.consecutiveFailures} consecutive failures):`, error);
    
    // If we have retries left, try again with backoff
    if (this.state.retryCount < this.config.maxRetries) {
      const backoffDelay = this.config.retryBackoffMs * Math.pow(2, this.state.retryCount - 1);
      MapUtils.log(`⏳ Retrying in ${backoffDelay / 1000}s...`);
      
      setTimeout(() => {
        this.fetchCubeLocation();
      }, backoffDelay);
      
      return;
    }
    
    // All retries exhausted - adjust strategy
    this.state.retryCount = 0;
    
    // Adjust update interval based on failure count
    if (this.state.consecutiveFailures >= 5) {
      this.state.currentInterval = this.config.offlineInterval;
      this.setApiStatus('offline');
    } else if (this.state.consecutiveFailures >= 2) {
      this.state.currentInterval = this.config.slowInterval;
      this.setApiStatus('degraded');
    }
    
    // Restart updates with new interval
    this.startSmartUpdates();
    
    // Try to use cached data if available
    this.loadFromStorage();
    
    // Notify error callbacks
    this.handleError(error);
  },
  
  // Handle location update from any source
  handleLocationUpdate: function(data, source = 'unknown') {
    MapUtils.log(`📍 Location update received from ${source}:`, data);
    
    if (data.error && !data.lat) {
      this.handleError(new Error(data.message || data.error));
      return;
    }
    
    // Validate required fields
    if (!data.lat || !data.lng) {
      this.handleError(new Error('Invalid location data: missing coordinates'));
      return;
    }
    
    // Add metadata about data source and age
    const enrichedData = {
      ...data,
      _source: source,
      _receivedAt: new Date().toISOString(),
      _isStale: this.isDataStale(data),
      _isExpired: this.isDataExpired(data)
    };
    
    // Update cache
    this.cache.lastLocation = enrichedData;
    this.cache.lastUpdate = new Date();
    
    // Set appropriate status
    if (source === 'static') {
      this.setApiStatus('static');
    } else if (source === 'storage' && this.state.consecutiveFailures > 0) {
      this.setApiStatus('offline');
    } else {
      this.setApiStatus('online');
    }
    
    // Add to history (only for non-stale data)
    if (!enrichedData._isStale && !data.stale) {
      this.addToHistory(enrichedData);
    }
    
    // Notify callbacks
    this.callbacks.onLocationUpdate.forEach(callback => {
      try {
        callback(enrichedData);
      } catch (error) {
        MapUtils.error('Error in location update callback:', error);
      }
    });
  },
  
  // Handle API errors
  handleError: function(error) {
    MapUtils.error('API Error:', error);
    
    // Notify error callbacks
    this.callbacks.onError.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        MapUtils.error('Error in error callback:', callbackError);
      }
    });
  },
  
  // Set API status and notify callbacks
  setApiStatus: function(status) {
    const oldStatus = this.cache.apiStatus;
    this.cache.apiStatus = status;
    
    if (oldStatus !== status) {
      MapUtils.log(`📡 API status changed: ${oldStatus} -> ${status}`);
      
      this.callbacks.onStatusChange.forEach(callback => {
        try {
          callback(status, oldStatus);
        } catch (error) {
          MapUtils.error('Error in status change callback:', error);
        }
      });
    }
  },
  
  // Add location to history
  addToHistory: function(locationData) {
    const historyEntry = {
      lat: locationData.lat,
      lng: locationData.lng,
      timestamp: locationData.timestamp || new Date().toISOString(),
      address: locationData.address,
      context: locationData.context,
      source: locationData._source || 'unknown'
    };
    
    this.cache.locationHistory.push(historyEntry);
    
    // Keep only recent items
    if (this.cache.locationHistory.length > this.config.maxHistoryItems) {
      this.cache.locationHistory = this.cache.locationHistory.slice(-this.config.maxHistoryItems);
    }
  },
  
  // Save data to localStorage
  saveToStorage: function() {
    if (!window.localStorage) {
      MapUtils.log('⚠️ localStorage not available');
      return;
    }
    
    try {
      const dataToStore = {
        lastLocation: this.cache.lastLocation,
        locationHistory: this.cache.locationHistory.slice(-20), // Store only recent history
        lastUpdate: this.cache.lastUpdate?.toISOString(),
        savedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(dataToStore));
      MapUtils.log('💾 Data saved to localStorage');
    } catch (error) {
      MapUtils.error('❌ Failed to save to localStorage:', error);
    }
  },
  
  // Load data from localStorage
  loadFromStorage: function() {
    if (!window.localStorage) {
      MapUtils.log('⚠️ localStorage not available');
      return false;
    }
    
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        MapUtils.log('📭 No stored data found');
        return false;
      }
      
      const data = JSON.parse(stored);
      
      // Validate stored data
      if (!data.version || !data.lastLocation) {
        MapUtils.log('⚠️ Invalid stored data format');
        return false;
      }
      
      // Check if data is too old
      const savedAt = new Date(data.savedAt);
      const ageMs = Date.now() - savedAt.getTime();
      
      if (ageMs > this.config.expiredThresholdMs) {
        MapUtils.log(`⚠️ Stored data too old (${Math.round(ageMs / 1000 / 60 / 60)}h), ignoring`);
        return false;
      }
      
      // Restore data
      if (data.lastLocation) {
        this.handleLocationUpdate(data.lastLocation, 'storage');
      }
      
      if (data.locationHistory) {
        this.cache.locationHistory = data.locationHistory;
      }
      
      MapUtils.log(`📂 Loaded data from storage (saved ${Math.round(ageMs / 1000 / 60)}m ago)`);
      return true;
      
    } catch (error) {
      MapUtils.error('❌ Failed to load from localStorage:', error);
      return false;
    }
  },
  
  // Check if data is stale
  isDataStale: function(data) {
    if (!data.timestamp) return false;
    
    const dataTime = new Date(data.timestamp);
    const ageMs = Date.now() - dataTime.getTime();
    
    return ageMs > this.config.staleThresholdMs;
  },
  
  // Check if data is expired
  isDataExpired: function(data) {
    if (!data.timestamp) return false;
    
    const dataTime = new Date(data.timestamp);
    const ageMs = Date.now() - dataTime.getTime();
    
    return ageMs > this.config.expiredThresholdMs;
  },
  
  // Public getters
  getCurrentLocation: function() {
    return this.cache.lastLocation;
  },
  
  getLocationHistory: function() {
    return this.cache.locationHistory.map(entry => [entry.lat, entry.lng]);
  },
  
  getLocationHistoryFull: function() {
    return this.cache.locationHistory.slice(); // Return copy
  },
  
  getApiStatus: function() {
    return this.cache.apiStatus;
  },
  
  getLastUpdate: function() {
    return this.cache.lastUpdate;
  },
  
  getStatusClass: function() {
    switch (this.cache.apiStatus) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'static': return 'status-static';
      case 'degraded': return 'status-degraded';
      case 'loading': return 'status-loading';
      default: return 'status-loading';
    }
  },
  
  // Enhanced display formatting
  formatLocationDisplay: function(locationData) {
    if (!locationData) return 'No location data';
    
    let display = '';
    
    if (locationData.address) {
      display += locationData.address;
    } else {
      display += `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`;
    }
    
    if (locationData.closest_landmark) {
      display += ` (${locationData.closest_landmark})`;
    }
    
    if (locationData.context) {
      display += `\n${locationData.context}`;
    }
    
    // Add source and status information
    const source = locationData._source || 'unknown';
    const receivedAt = locationData._receivedAt ? new Date(locationData._receivedAt) : null;
    
    if (source === 'static') {
      display += '\n🔸 Static data (GitHub Pages mode)';
    } else if (source === 'storage') {
      display += '\n🔸 Cached data (offline mode)';
    } else if (source === 'api') {
      if (locationData.cached) {
        if (locationData.stale) {
          display += '\n🔸 Stale cached data (API unavailable)';
        } else {
          display += `\n🟡 Cached data (${Math.round(locationData.cache_age)}s old)`;
        }
      } else {
        display += '\n🟢 Fresh data';
      }
    }
    
    // Add age information
    if (receivedAt) {
      const ageMs = Date.now() - receivedAt.getTime();
      const ageMinutes = Math.round(ageMs / 1000 / 60);
      if (ageMinutes > 0) {
        display += `\n⏰ ${ageMinutes}m ago`;
      }
    }
    
    return display;
  },
  
  // Clear all data
  clearCache: function() {
    this.cache = {
      lastLocation: null,
      locationHistory: [],
      lastUpdate: null,
      apiStatus: 'connecting'
    };
    
    // Clear localStorage
    if (window.localStorage) {
      localStorage.removeItem(this.config.storageKey);
    }
    
    MapUtils.log('🗑️ Cache cleared');
  },
  
  // Manual refresh (for user-triggered updates)
  refresh: function() {
    if (this.state.isStaticMode) {
      MapUtils.log('⚠️ Manual refresh not available in static mode');
      return;
    }
    
    MapUtils.log('🔄 Manual refresh triggered');
    this.state.retryCount = 0; // Reset retry count for manual refresh
    this.fetchCubeLocation();
  },
  
  // Get diagnostic information
  getDiagnostics: function() {
    return {
      mode: this.state.isStaticMode ? 'static' : 'dynamic',
      apiStatus: this.cache.apiStatus,
      currentInterval: this.state.currentInterval,
      consecutiveFailures: this.state.consecutiveFailures,
      lastSuccessfulFetch: this.state.lastSuccessfulFetch,
      hasStoredData: window.localStorage && !!localStorage.getItem(this.config.storageKey),
      cacheSize: this.cache.locationHistory.length,
      lastUpdate: this.cache.lastUpdate
    };
  }
};