// Map initialization and setup for external cube tracker

window.MapSetup = {
  map: null,
  layerGroups: {
    landmarks: null,
    streets: null,
    boundaries: null,
    toilets: null,
    cube: null,
    route: null
  },
  
  // Initialize the map
  init: function() {
    MapUtils.log('Initializing map...');
    
    // Create map centered on Burning Man
    this.map = L.map('map', {
      center: [40.7864, -119.2065], // Golden Spike
      zoom: 15,
      minZoom: 12,
      maxZoom: 18,
      maxBounds: MAP_CONFIG.mapBounds,
      maxBoundsViscosity: 1.0
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors | GlitchCube Live Tracker',
      maxZoom: 18
    }).addTo(this.map);
    
    // Initialize layer groups
    this.initLayerGroups();
    
    // Load initial map data
    this.loadInitialData();
    
    MapUtils.log('Map initialization complete');
    return this.map;
  },
  
  // Initialize layer groups for organized display
  initLayerGroups: function() {
    this.layerGroups.boundaries = L.layerGroup().addTo(this.map);
    this.layerGroups.streets = L.layerGroup(); // Not added by default
    this.layerGroups.landmarks = L.layerGroup().addTo(this.map);
    this.layerGroups.toilets = L.layerGroup(); // Not added by default
    this.layerGroups.cube = L.layerGroup().addTo(this.map);
    this.layerGroups.route = L.layerGroup(); // Not added by default
  },
  
  // Load initial essential data
  loadInitialData: function() {
    MapUtils.log('Loading initial map data...');
    
    // Load trash fence (boundary)
    this.loadGeoJsonData('trash_fence', (data) => {
      if (data && data.features) {
        data.features.forEach(feature => {
          const layer = L.geoJSON(feature, {
            style: {
              color: '#ff6b6b',
              weight: 3,
              opacity: 0.8,
              fillOpacity: 0.1
            }
          });
          this.layerGroups.boundaries.addLayer(layer);
        });
        MapUtils.log('Trash fence loaded');
      }
    });
    
    // Load landmarks
    this.loadGeoJsonData('burning_man_landmarks', (data) => {
      if (data && data.landmarks) {
        data.landmarks.forEach(landmark => {
          const marker = L.circleMarker([landmark.lat, landmark.lng], {
            radius: this.getLandmarkRadius(landmark.type),
            fillColor: this.getLandmarkColor(landmark.type),
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8
          });
          
          marker.bindPopup(`
            <strong>${landmark.name}</strong><br>
            <em>${landmark.type}</em><br>
            ${landmark.description || ''}
          `);
          
          this.layerGroups.landmarks.addLayer(marker);
        });
        MapUtils.log('Landmarks loaded');
      }
    });
  },
  
  // Load GeoJSON data from API
  loadGeoJsonData: function(dataset, callback) {
    fetch(`/api/geojson/${dataset}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        callback(data);
      })
      .catch(error => {
        MapUtils.error(`Failed to load ${dataset}:`, error);
      });
  },
  
  // Load streets (on-demand)
  loadStreets: function() {
    if (this.layerGroups.streets.hasLayer) {
      MapUtils.log('Streets already loaded');
      return;
    }
    
    this.loadGeoJsonData('street_lines', (data) => {
      if (data && data.features) {
        data.features.forEach(feature => {
          const layer = L.geoJSON(feature, {
            style: {
              color: '#ffffff',
              weight: 2,
              opacity: 0.6
            }
          });
          
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
          }
          
          this.layerGroups.streets.addLayer(layer);
        });
        MapUtils.log('Streets loaded');
      }
    });
  },
  
  // Load toilets (on-demand)  
  loadToilets: function() {
    if (this.layerGroups.toilets.hasLayer) {
      MapUtils.log('Toilets already loaded');
      return;
    }
    
    this.loadGeoJsonData('toilets', (data) => {
      if (data && data.features) {
        data.features.forEach(feature => {
          const layer = L.geoJSON(feature, {
            style: {
              color: '#8b4513',
              weight: 2,
              fillOpacity: 0.3,
              fillColor: '#d2b48c'
            }
          });
          
          layer.bindPopup('<strong>Portable Toilet</strong>');
          this.layerGroups.toilets.addLayer(layer);
        });
        MapUtils.log('Toilets loaded');
      }
    });
  },
  
  // Get landmark visual properties
  getLandmarkRadius: function(type) {
    switch(type) {
      case 'center': case 'sacred': return 12;
      case 'medical': case 'ranger': return 10;
      case 'service': return 8;
      case 'art': return 6;
      default: return 5;
    }
  },
  
  getLandmarkColor: function(type) {
    switch(type) {
      case 'center': return '#ff6b6b'; // Red for Man
      case 'sacred': return '#9b59b6'; // Purple for Temple
      case 'medical': return '#e74c3c'; // Red for medical
      case 'ranger': return '#3498db'; // Blue for rangers
      case 'service': return '#f39c12'; // Orange for services
      case 'art': return '#2ecc71'; // Green for art
      default: return '#95a5a6'; // Gray for other
    }
  },
  
  // Toggle layer visibility
  toggleLayer: function(layerName) {
    const layer = this.layerGroups[layerName];
    if (!layer) return false;
    
    if (this.map.hasLayer(layer)) {
      this.map.removeLayer(layer);
      return false;
    } else {
      // Load data if needed
      if (layerName === 'streets') {
        this.loadStreets();
      } else if (layerName === 'toilets') {
        this.loadToilets();
      }
      
      this.map.addLayer(layer);
      return true;
    }
  },
  
  // Center map on specific coordinates
  centerOn: function(lat, lng, zoom = null) {
    if (zoom) {
      this.map.setView([lat, lng], zoom);
    } else {
      this.map.panTo([lat, lng]);
    }
  },
  
  // Get layer group reference
  getLayer: function(layerName) {
    return this.layerGroups[layerName];
  }
};