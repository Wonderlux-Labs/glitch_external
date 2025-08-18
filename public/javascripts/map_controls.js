// Map controls for external cube tracker

window.MapControls = {
  controlStates: {
    route: false,
    landmarks: true,
    streets: false,
    toilets: false
  },
  
  // Initialize map controls
  init: function() {
    this.setupControlButtons();
    this.setupStatusPanel();
    MapUtils.log('Map controls initialized');
  },
  
  // Setup control button event listeners
  setupControlButtons: function() {
    // Center on cube button
    const centerButton = document.getElementById('center-button');
    if (centerButton) {
      centerButton.addEventListener('click', () => {
        const success = CubeTracker.centerOnCube(16);
        this.showFeedback(centerButton, success);
      });
    }
    
    // Route toggle button
    const routeToggle = document.getElementById('route-toggle');
    if (routeToggle) {
      routeToggle.addEventListener('click', () => {
        const isEnabled = CubeTracker.toggleRoute();
        this.controlStates.route = isEnabled;
        this.updateButtonState(routeToggle, isEnabled);
      });
    }
    
    // Landmarks toggle button
    const landmarksToggle = document.getElementById('landmarks-toggle');
    if (landmarksToggle) {
      landmarksToggle.addEventListener('click', () => {
        const isEnabled = MapSetup.toggleLayer('landmarks');
        this.controlStates.landmarks = isEnabled;
        this.updateButtonState(landmarksToggle, isEnabled);
      });
    }
    
    // Streets toggle button
    const streetsToggle = document.getElementById('streets-toggle');
    if (streetsToggle) {
      streetsToggle.addEventListener('click', () => {
        const isEnabled = MapSetup.toggleLayer('streets');
        this.controlStates.streets = isEnabled;
        this.updateButtonState(streetsToggle, isEnabled);
      });
    }
    
    // Compass button (center on Golden Spike)
    const compassButton = document.getElementById('compass-button');
    if (compassButton) {
      compassButton.addEventListener('click', () => {
        MapSetup.centerOn(MAP_CONFIG.goldenSpike.lat, MAP_CONFIG.goldenSpike.lng, 15);
        this.showFeedback(compassButton, true);
      });
    }
  },
  
  // Setup status panel updates
  setupStatusPanel: function() {
    // Register for data callbacks
    MapData.onLocationUpdate(this.updateLocationDisplay.bind(this));
    MapData.onStatusChange(this.updateStatusIndicator.bind(this));
    MapData.onError(this.showError.bind(this));
    
    // Update display every 30 seconds
    setInterval(() => {
      this.updateTimeDisplay();
    }, 30000);
  },
  
  // Update button visual state
  updateButtonState: function(button, isActive) {
    if (isActive) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  },
  
  // Show button feedback
  showFeedback: function(button, success) {
    const originalBg = button.style.background;
    button.style.background = success ? 'rgba(0, 200, 0, 0.8)' : 'rgba(200, 0, 0, 0.8)';
    
    setTimeout(() => {
      button.style.background = originalBg;
    }, 300);
  },
  
  // Update location display in status panel
  updateLocationDisplay: function(locationData) {
    const locationTextEl = document.getElementById('location-text');
    const coordinatesEl = document.getElementById('coordinates');
    const contextEl = document.getElementById('context');
    
    if (locationTextEl) {
      if (locationData.address) {
        locationTextEl.textContent = locationData.address;
      } else {
        locationTextEl.textContent = `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`;
      }
    }
    
    if (coordinatesEl) {
      let coordText = `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`;
      if (locationData.distance_from_man) {
        coordText += ` • ${locationData.distance_from_man}`;
      }
      coordinatesEl.textContent = coordText;
    }
    
    if (contextEl) {
      let contextText = '';
      
      if (locationData.closest_landmark) {
        contextText += locationData.closest_landmark;
      }
      
      if (locationData.context && locationData.context !== locationData.closest_landmark) {
        if (contextText) contextText += ' • ';
        contextText += locationData.context;
      }
      
      contextEl.textContent = contextText;
    }
    
    // Hide error message on successful update
    this.hideError();
    
    // Update time display
    this.updateTimeDisplay();
  },
  
  // Update status indicator
  updateStatusIndicator: function(status) {
    const statusIndicator = document.getElementById('status-indicator');
    
    if (statusIndicator) {
      // Remove all status classes
      statusIndicator.classList.remove('status-online', 'status-offline', 'status-loading');
      
      // Add current status class
      statusIndicator.classList.add(MapData.getStatusClass());
    }
    
    // Update text based on status
    if (status === 'offline') {
      this.showError(new Error('Connection to GlitchCube lost'));
    } else if (status === 'online') {
      this.hideError();
    }
  },
  
  // Show error message
  showError: function(error) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.textContent = error.message || 'Unknown error';
      errorEl.style.display = 'block';
    }
  },
  
  // Hide error message
  hideError: function() {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  },
  
  // Update time display
  updateTimeDisplay: function() {
    const timeEl = document.getElementById('update-time');
    const lastUpdate = MapData.getLastUpdate();
    
    if (timeEl && lastUpdate) {
      const timeText = MapUtils.formatTimestamp(lastUpdate.toISOString());
      timeEl.textContent = `Last update: ${timeText}`;
    }
  },
  
  // Set initial button states
  setInitialStates: function() {
    // Set landmarks as initially active
    const landmarksToggle = document.getElementById('landmarks-toggle');
    if (landmarksToggle) {
      this.updateButtonState(landmarksToggle, this.controlStates.landmarks);
    }
    
    // Set other controls as inactive
    const routeToggle = document.getElementById('route-toggle');
    if (routeToggle) {
      this.updateButtonState(routeToggle, this.controlStates.route);
    }
    
    const streetsToggle = document.getElementById('streets-toggle');
    if (streetsToggle) {
      this.updateButtonState(streetsToggle, this.controlStates.streets);
    }
  },
  
  // Handle keyboard shortcuts
  setupKeyboardShortcuts: function() {
    document.addEventListener('keydown', (event) => {
      // Only handle if not typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch(event.key.toLowerCase()) {
        case 'c':
          // Center on cube
          CubeTracker.centerOnCube(16);
          break;
        case 'r':
          // Toggle route
          document.getElementById('route-toggle')?.click();
          break;
        case 'l':
          // Toggle landmarks
          document.getElementById('landmarks-toggle')?.click();
          break;
        case 's':
          // Toggle streets
          document.getElementById('streets-toggle')?.click();
          break;
        case 'm':
          // Center on Man (Golden Spike)
          document.getElementById('compass-button')?.click();
          break;
      }
    });
    
    MapUtils.log('Keyboard shortcuts enabled: C=Center, R=Route, L=Landmarks, S=Streets, M=Man');
  }
};