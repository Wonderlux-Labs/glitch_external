// Data management for external cube tracker
// Handles API communication with main GlitchCube app

window.MapData = {
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
  
  // Fetch current cube location from API
  fetchCubeLocation: function() {
    MapUtils.log('Fetching cube location...');
    
    this.setApiStatus('loading');
    
    fetch('/api/cube_location')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        this.handleLocationUpdate(data);
      })
      .catch(error => {
        this.handleError(error);
      });
  },
  
  // Handle successful location update
  handleLocationUpdate: function(data) {
    MapUtils.log('Location update received:', data);
    
    if (data.error) {
      this.handleError(new Error(data.message || data.error));
      return;
    }
    
    // Validate required fields
    if (!data.lat || !data.lng) {
      this.handleError(new Error('Invalid location data: missing coordinates'));
      return;
    }
    
    // Log cache information if present
    if (data.cached !== undefined) {
      if (data.cached) {
        MapUtils.log(`Using cached data (age: ${data.cache_age}s, expires in: ${data.cache_expires_in}s)`);
        if (data.stale) {
          MapUtils.log('Cache is stale but API failed, using stale cache');
        }
      } else {
        MapUtils.log('Fresh data fetched from API');
      }
    }
    
    // Update cache
    this.cache.lastLocation = data;
    this.cache.lastUpdate = new Date();
    this.setApiStatus('online');
    
    // Add to history (only if not stale cached data)
    if (!data.stale) {
      this.addToHistory(data);
    }
    
    // Notify callbacks
    this.callbacks.onLocationUpdate.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        MapUtils.error('Error in location update callback:', error);
      }
    });
  },
  
  // Handle API errors
  handleError: function(error) {
    MapUtils.error('API Error:', error);
    
    this.setApiStatus('offline');
    
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
      MapUtils.log(`API status changed: ${oldStatus} -> ${status}`);
      
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
      context: locationData.context
    };
    
    this.cache.locationHistory.push(historyEntry);
    
    // Keep only last 100 points to prevent memory issues
    if (this.cache.locationHistory.length > 100) {
      this.cache.locationHistory = this.cache.locationHistory.slice(-100);
    }
  },
  
  // Get current location
  getCurrentLocation: function() {
    return this.cache.lastLocation;
  },
  
  // Get location history as coordinate array
  getLocationHistory: function() {
    return this.cache.locationHistory.map(entry => [entry.lat, entry.lng]);
  },
  
  // Get location history with full data
  getLocationHistoryFull: function() {
    return this.cache.locationHistory.slice(); // Return copy
  },
  
  // Get API status
  getApiStatus: function() {
    return this.cache.apiStatus;
  },
  
  // Get last update time
  getLastUpdate: function() {
    return this.cache.lastUpdate;
  },
  
  // Clear cache
  clearCache: function() {
    this.cache = {
      lastLocation: null,
      locationHistory: [],
      lastUpdate: null,
      apiStatus: 'connecting'
    };
    MapUtils.log('Cache cleared');
  },
  
  // Start periodic updates
  startPeriodicUpdates: function(intervalMs) {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    MapUtils.log(`Starting periodic updates every ${intervalMs}ms`);
    
    // Initial fetch
    this.fetchCubeLocation();
    
    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.fetchCubeLocation();
    }, intervalMs);
  },
  
  // Stop periodic updates
  stopPeriodicUpdates: function() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      MapUtils.log('Periodic updates stopped');
    }
  },
  
  // Format location for display
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
    
    // Add cache status
    if (locationData.cached !== undefined) {
      if (locationData.cached) {
        if (locationData.stale) {
          display += '\n🔸 Using stale cached data (API unavailable)';
        } else {
          display += `\n🟡 Cached data (${Math.round(locationData.cache_age)}s old)`;
        }
      } else {
        display += '\n🟢 Fresh data';
      }
    }
    
    return display;
  },
  
  // Get status indicator class
  getStatusClass: function() {
    switch (this.cache.apiStatus) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'loading': return 'status-loading';
      default: return 'status-loading';
    }
  }
};