// Cube tracking and visualization for external map app

window.CubeTracker = {
  cubeMarker: null,
  routePolyline: null,
  routeDecorator: null,
  showRoute: false,
  
  // Initialize cube tracking
  init: function(map) {
    this.map = map;
    
    // Set up data callbacks
    MapData.onLocationUpdate(this.updateCubeLocation.bind(this));
    MapData.onStatusChange(this.handleStatusChange.bind(this));
    MapData.onError(this.handleError.bind(this));
    
    MapUtils.log('Cube tracker initialized');
  },
  
  // Update cube location on map
  updateCubeLocation: function(locationData) {
    MapUtils.log('Updating cube location on map');
    
    const lat = locationData.lat;
    const lng = locationData.lng;
    
    // Create or update cube marker
    this.updateCubeMarker(lat, lng, locationData);
    
    // Update route if enabled
    if (this.showRoute) {
      this.updateRoute();
    }
  },
  
  // Create or update the cube marker
  updateCubeMarker: function(lat, lng, locationData) {
    const cubeLayer = MapSetup.getLayer('cube');
    
    // Remove existing marker
    if (this.cubeMarker) {
      cubeLayer.removeLayer(this.cubeMarker);
    }
    
    // Create new marker with cube icon
    this.cubeMarker = L.marker([lat, lng], {
      icon: MapUtils.createCubeIcon(),
      title: 'GlitchCube Current Location'
    });
    
    // Create popup content
    const popupContent = this.createPopupContent(locationData);
    this.cubeMarker.bindPopup(popupContent);
    
    // Add to map
    cubeLayer.addLayer(this.cubeMarker);
    
    // Pulse animation effect
    this.addPulseEffect(lat, lng);
  },
  
  // Add pulse animation around cube
  addPulseEffect: function(lat, lng) {
    const cubeLayer = MapSetup.getLayer('cube');
    
    // Remove any existing pulse
    if (this.pulseCircle) {
      cubeLayer.removeLayer(this.pulseCircle);
    }
    
    // Create pulse circle
    this.pulseCircle = L.circleMarker([lat, lng], {
      radius: 20,
      fillOpacity: 0,
      color: '#4ecdc4',
      weight: 3,
      opacity: 0.8
    });
    
    cubeLayer.addLayer(this.pulseCircle);
    
    // Animate pulse
    let radius = 20;
    let opacity = 0.8;
    const pulseAnimation = setInterval(() => {
      radius += 2;
      opacity -= 0.05;
      
      if (opacity <= 0) {
        clearInterval(pulseAnimation);
        if (this.pulseCircle) {
          cubeLayer.removeLayer(this.pulseCircle);
          this.pulseCircle = null;
        }
        return;
      }
      
      this.pulseCircle.setStyle({
        radius: radius,
        opacity: opacity
      });
    }, 100);
  },
  
  // Create popup content for cube marker
  createPopupContent: function(locationData) {
    let content = '<div style="min-width: 200px;">';
    content += '<h3 style="margin: 0 0 10px 0; color: #4ecdc4;">🎲 GlitchCube</h3>';
    
    // Location info
    if (locationData.address) {
      content += `<strong>Location:</strong> ${locationData.address}<br>`;
    }
    
    // Coordinates
    content += `<strong>Coordinates:</strong> ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}<br>`;
    
    // Context information
    if (locationData.context) {
      content += `<strong>Context:</strong> ${locationData.context}<br>`;
    }
    
    // Nearest landmark
    if (locationData.closest_landmark) {
      content += `<strong>Near:</strong> ${locationData.closest_landmark}<br>`;
    }
    
    // Distance from Man
    if (locationData.distance_from_man) {
      content += `<strong>Distance:</strong> ${locationData.distance_from_man}<br>`;
    }
    
    // Nearby landmarks
    if (locationData.nearby_landmarks && locationData.nearby_landmarks.length > 0) {
      content += '<strong>Nearby:</strong><ul style="margin: 5px 0; padding-left: 20px;">';
      locationData.nearby_landmarks.slice(0, 3).forEach(landmark => {
        content += `<li>${landmark.name} (${landmark.distance_text})</li>`;
      });
      content += '</ul>';
    }
    
    // Timestamp
    if (locationData.timestamp) {
      const updateTime = MapUtils.formatTimestamp(locationData.timestamp);
      content += `<div style="color: #888; font-size: 11px; margin-top: 8px;">Updated: ${updateTime}</div>`;
    }
    
    // Data source
    if (locationData.source) {
      content += `<div style="color: #666; font-size: 10px;">Source: ${locationData.source}</div>`;
    }
    
    content += '</div>';
    return content;
  },
  
  // Update route visualization
  updateRoute: function() {
    const routeLayer = MapSetup.getLayer('route');
    const history = MapData.getLocationHistory();
    
    // Remove existing route
    if (this.routePolyline) {
      routeLayer.removeLayer(this.routePolyline);
    }
    if (this.routeDecorator) {
      routeLayer.removeLayer(this.routeDecorator);
    }
    
    if (history.length < 2) {
      MapUtils.log('Not enough history points for route');
      return;
    }
    
    // Create route polyline
    const routeResult = MapUtils.createRoutePolyline(history, this.map);
    
    if (routeResult) {
      this.routePolyline = routeResult.polyline;
      this.routeDecorator = routeResult.decorator;
      
      // Add to map
      routeLayer.addLayer(this.routePolyline);
      if (this.routeDecorator) {
        routeLayer.addLayer(this.routeDecorator);
      }
      
      MapUtils.log(`Route updated with ${history.length} points`);
    }
  },
  
  // Toggle route display
  toggleRoute: function() {
    this.showRoute = !this.showRoute;
    
    const routeLayer = MapSetup.getLayer('route');
    
    if (this.showRoute) {
      // Add route layer to map
      if (!this.map.hasLayer(routeLayer)) {
        this.map.addLayer(routeLayer);
      }
      this.updateRoute();
      MapUtils.log('Route display enabled');
    } else {
      // Remove route layer from map
      if (this.map.hasLayer(routeLayer)) {
        this.map.removeLayer(routeLayer);
      }
      MapUtils.log('Route display disabled');
    }
    
    return this.showRoute;
  },
  
  // Center map on cube location
  centerOnCube: function(zoom = null) {
    const currentLocation = MapData.getCurrentLocation();
    
    if (currentLocation) {
      MapSetup.centerOn(currentLocation.lat, currentLocation.lng, zoom);
      MapUtils.log('Centered map on cube location');
      return true;
    } else {
      MapUtils.log('No cube location available to center on');
      return false;
    }
  },
  
  // Handle status changes
  handleStatusChange: function(status, oldStatus) {
    MapUtils.log(`Cube tracker status: ${oldStatus} -> ${status}`);
    
    // Could add visual indicators here
    if (status === 'offline' && this.cubeMarker) {
      // Make marker semi-transparent when offline
      this.cubeMarker.setOpacity(0.5);
    } else if (status === 'online' && this.cubeMarker) {
      // Restore full opacity when back online
      this.cubeMarker.setOpacity(1.0);
    }
  },
  
  // Handle errors
  handleError: function(error) {
    MapUtils.error('Cube tracker error:', error);
    
    // Could show error indicators on map
  },
  
  // Get current cube coordinates
  getCurrentCoordinates: function() {
    const location = MapData.getCurrentLocation();
    return location ? [location.lat, location.lng] : null;
  },
  
  // Check if cube is currently visible on map
  isCubeVisible: function() {
    if (!this.cubeMarker) return false;
    
    const bounds = this.map.getBounds();
    const cubeLatLng = this.cubeMarker.getLatLng();
    
    return bounds.contains(cubeLatLng);
  }
};