// GlitchCube Map - Simplified Static Version
// Combines essential functionality from multiple modules

// Global map and layers
let map = null;
let cubeMarker = null;
let layerGroups = {
    landmarks: null,
    streets: null,
    boundaries: null,
    cube: null
};

// Utility functions
const MapUtils = {
    log: function(message, data) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`, data || '');
    },
    
    error: function(message, error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR: ${message}`, error || '');
    },
    
    formatTimestamp: function(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return diffMins + 'm ago';
        } else {
            const diffHours = Math.floor(diffMins / 60);
            return diffHours + 'h ago';
        }
    },
    
    createCubeIcon: function() {
        const cubeIconSvg = `
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#4ecdc4;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#45b7d1;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="4" y="4" width="24" height="24" rx="4" ry="4" 
                      fill="url(#cubeGradient)" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="16" r="4" fill="#fff" opacity="0.8"/>
                <text x="16" y="20" text-anchor="middle" fill="#000" font-size="8" font-weight="bold">●</text>
            </svg>
        `;
        
        const iconUrl = 'data:image/svg+xml;charset=UTF-8;base64,' + btoa(cubeIconSvg);
        
        return L.icon({
            iconUrl: iconUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    }
};

// Map initialization
function initializeMap() {
    MapUtils.log('Initializing map...');
    
    // Create map
    map = L.map('map', {
        center: [40.7864, -119.2065], // Golden Spike
        zoom: 15,
        minZoom: 12,
        maxZoom: 18,
        maxBounds: window.MAP_CONFIG.mapBounds,
        maxBoundsViscosity: 1.0
    });
    
    // Add tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | GlitchCube Live Tracker',
        maxZoom: 18
    }).addTo(map);
    
    // Initialize layer groups
    layerGroups.boundaries = L.layerGroup().addTo(map);
    layerGroups.streets = L.layerGroup();
    layerGroups.landmarks = L.layerGroup().addTo(map);
    layerGroups.cube = L.layerGroup().addTo(map);
    
    MapUtils.log('Map initialization complete');
}

// Load GeoJSON data
async function loadGeoJsonData(filename) {
    try {
        const response = await fetch(`geojson/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        MapUtils.error(`Failed to load ${filename}:`, error);
        return null;
    }
}

// Load map data
async function loadMapData() {
    MapUtils.log('Loading map data...');
    
    // Load landmarks
    try {
        const landmarksData = await loadGeoJsonData('burning_man_landmarks.json');
        if (landmarksData && landmarksData.landmarks) {
            landmarksData.landmarks.forEach(landmark => {
                const marker = L.circleMarker([landmark.lat, landmark.lng], {
                    radius: getLandmarkRadius(landmark.type),
                    fillColor: getLandmarkColor(landmark.type),
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.8
                });
                
                marker.bindPopup(`
                    <strong>${landmark.name}</strong><br>
                    <em>${landmark.type}</em><br>
                    ${landmark.description || ''}
                `);
                
                layerGroups.landmarks.addLayer(marker);
            });
            MapUtils.log('Landmarks loaded');
        }
    } catch (error) {
        MapUtils.error('Failed to load landmarks:', error);
    }
    
    // Load trash fence (boundaries)
    try {
        const trashFenceData = await loadGeoJsonData('trash_fence.geojson');
        if (trashFenceData && trashFenceData.features) {
            trashFenceData.features.forEach(feature => {
                const layer = L.geoJSON(feature, {
                    style: {
                        color: '#ff6b6b',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.1
                    }
                });
                layerGroups.boundaries.addLayer(layer);
            });
            MapUtils.log('Trash fence loaded');
        }
    } catch (error) {
        MapUtils.error('Failed to load trash fence:', error);
    }
    
    // Load streets on demand
    window.loadStreets = async function() {
        if (map.hasLayer(layerGroups.streets)) return;
        
        try {
            const streetsData = await loadGeoJsonData('street_lines.geojson');
            if (streetsData && streetsData.features) {
                streetsData.features.forEach(feature => {
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
                    
                    layerGroups.streets.addLayer(layer);
                });
                MapUtils.log('Streets loaded');
            }
        } catch (error) {
            MapUtils.error('Failed to load streets:', error);
        }
    };
}

// Landmark styling
function getLandmarkRadius(type) {
    switch(type) {
        case 'center': case 'sacred': return 12;
        case 'medical': case 'ranger': return 10;
        case 'service': return 8;
        case 'art': return 6;
        default: return 5;
    }
}

function getLandmarkColor(type) {
    switch(type) {
        case 'center': return '#ff6b6b';
        case 'sacred': return '#9b59b6';
        case 'medical': return '#e74c3c';
        case 'ranger': return '#3498db';
        case 'service': return '#f39c12';
        case 'art': return '#2ecc71';
        default: return '#95a5a6';
    }
}

// Update cube location
function updateCubeLocation() {
    const locationData = window.CUBE_LOCATION;
    if (!locationData) return;
    
    const lat = locationData.lat;
    const lng = locationData.lng;
    
    // Remove existing marker
    if (cubeMarker) {
        layerGroups.cube.removeLayer(cubeMarker);
    }
    
    // Create new marker
    cubeMarker = L.marker([lat, lng], {
        icon: MapUtils.createCubeIcon(),
        title: 'GlitchCube Current Location'
    });
    
    // Create popup content
    let popupContent = '<div style="min-width: 200px;">';
    popupContent += '<h3 style="margin: 0 0 10px 0; color: #4ecdc4;">🎲 GlitchCube</h3>';
    
    if (locationData.address) {
        popupContent += `<strong>Location:</strong> ${locationData.address}<br>`;
    }
    
    popupContent += `<strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>`;
    
    if (locationData.distance_from_man) {
        popupContent += `<strong>Distance from Man:</strong> ${locationData.distance_from_man}<br>`;
    }
    
    if (locationData.timestamp) {
        const updateTime = MapUtils.formatTimestamp(locationData.timestamp);
        popupContent += `<div style="color: #888; font-size: 11px; margin-top: 8px;">Updated: ${updateTime}</div>`;
    }
    
    if (locationData.source) {
        popupContent += `<div style="color: #666; font-size: 10px;">Source: ${locationData.source}</div>`;
    }
    
    popupContent += '</div>';
    cubeMarker.bindPopup(popupContent);
    
    // Add to map
    layerGroups.cube.addLayer(cubeMarker);
    
    MapUtils.log('Cube location updated');
}

// Map controls
function initializeControls() {
    // Center on cube button
    document.getElementById('center-button').addEventListener('click', function() {
        if (cubeMarker) {
            map.setView(cubeMarker.getLatLng(), 16);
        }
    });
    
    // Toggle landmarks
    document.getElementById('landmarks-toggle').addEventListener('click', function() {
        const button = this;
        if (map.hasLayer(layerGroups.landmarks)) {
            map.removeLayer(layerGroups.landmarks);
            button.classList.remove('active');
        } else {
            map.addLayer(layerGroups.landmarks);
            button.classList.add('active');
        }
    });
    
    // Toggle streets
    document.getElementById('streets-toggle').addEventListener('click', function() {
        const button = this;
        if (map.hasLayer(layerGroups.streets)) {
            map.removeLayer(layerGroups.streets);
            button.classList.remove('active');
        } else {
            if (window.loadStreets) {
                window.loadStreets().then(() => {
                    map.addLayer(layerGroups.streets);
                    button.classList.add('active');
                });
            }
        }
    });
    
    // Center on Man button
    document.getElementById('compass-button').addEventListener('click', function() {
        const goldenSpike = window.MAP_CONFIG.goldenSpike;
        map.setView([goldenSpike.lat, goldenSpike.lng], 15);
    });
    
    // Set initial button states
    document.getElementById('landmarks-toggle').classList.add('active');
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    MapUtils.log('🎲 GlitchCube Map initializing...');
    
    // Initialize map
    initializeMap();
    
    // Load data
    loadMapData();
    
    // Update cube location
    updateCubeLocation();
    
    // Initialize controls
    initializeControls();
    
    // Add helpful console messages
    console.log('%c🎲 GlitchCube Static Demo', 'color: #4ecdc4; font-size: 16px; font-weight: bold;');
    console.log('This is a static demo showing Center Camp location');
    console.log('Controls: 📍 = Center on Cube, 🏛️ = Toggle Landmarks, 🛣️ = Toggle Streets, 🧭 = Center on Man');
    
    MapUtils.log('🎉 GlitchCube Map fully initialized');
});