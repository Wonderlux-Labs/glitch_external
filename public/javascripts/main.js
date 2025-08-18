// Main initialization script for external cube map

document.addEventListener('DOMContentLoaded', function() {
  MapUtils.log('Starting external cube map application...');
  
  // Initialize map
  const map = MapSetup.init();
  if (!map) {
    MapUtils.error('Failed to initialize map');
    return;
  }
  
  // Initialize cube tracker
  CubeTracker.init(map);
  
  // Initialize controls
  MapControls.init();
  MapControls.setInitialStates();
  
  // Setup keyboard shortcuts
  MapControls.setupKeyboardShortcuts();
  
  // Start periodic location updates
  const updateInterval = MAP_CONFIG.updateInterval || 120000; // Default 2 minutes
  MapData.startPeriodicUpdates(updateInterval);
  
  MapUtils.log(`Application initialized - polling every ${updateInterval/1000}s`);
  
  // Handle page visibility changes to pause/resume updates when tab is hidden
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      MapUtils.log('Page hidden - stopping updates');
      MapData.stopPeriodicUpdates();
    } else {
      MapUtils.log('Page visible - resuming updates');
      MapData.startPeriodicUpdates(updateInterval);
    }
  });
  
  // Handle window beforeunload to cleanup
  window.addEventListener('beforeunload', function() {
    MapData.stopPeriodicUpdates();
  });
  
  // Show initial loading status
  const statusIndicator = document.getElementById('status-indicator');
  const locationText = document.getElementById('location-text');
  
  if (locationText) {
    locationText.textContent = 'Connecting to GlitchCube...';
  }
  
  // Add some helpful console messages
  console.log('%c🎲 GlitchCube External Tracker', 'color: #4ecdc4; font-size: 16px; font-weight: bold;');
  console.log('%cKeyboard shortcuts:', 'color: #888; font-weight: bold;');
  console.log('C - Center on cube');
  console.log('R - Toggle route history');
  console.log('L - Toggle landmarks');
  console.log('S - Toggle streets');
  console.log('M - Center on The Man (Golden Spike)');
  console.log(`%cPolling interval: ${updateInterval/1000} seconds`, 'color: #888;');
  console.log(`%cAPI endpoint: ${MAP_CONFIG.glitchcubeApiUrl}`, 'color: #888;');
});

// Global error handler
window.addEventListener('error', function(event) {
  MapUtils.error('Global error:', event.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
  MapUtils.error('Unhandled promise rejection:', event.reason);
});