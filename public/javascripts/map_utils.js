// Map utility functions for external cube tracker
// Simplified from original glitchcube GPS map utils

window.MapUtils = {
  // Haversine distance calculation
  haversineDistance: function(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  },

  toRadians: function(degrees) {
    return degrees * (Math.PI / 180);
  },

  // Format distance for display
  formatDistance: function(meters) {
    if (meters < 1000) {
      return Math.round(meters) + 'm';
    } else {
      return (meters / 1000).toFixed(1) + 'km';
    }
  },

  // Format timestamp
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

  // BRC coordinate system utilities
  brcUtils: {
    // Golden Spike (center reference point)
    GOLDEN_SPIKE: { lat: 40.7864, lng: -119.2065 },
    
    // Convert lat/lng to BRC-style address
    coordinatesToBrcAddress: function(lat, lng) {
      const center = this.GOLDEN_SPIKE;
      
      // Calculate angle from center (0° = due north, clockwise)
      const deltaX = lng - center.lng;
      const deltaY = lat - center.lat;
      let angle = Math.atan2(deltaX, deltaY) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      
      // Convert to clock position
      const clockHour = Math.round(angle / 30); // 30° per hour
      const clockPos = clockHour === 0 ? 12 : clockHour;
      
      // Calculate distance from center
      const distance = MapUtils.haversineDistance(center.lat, center.lng, lat, lng);
      
      // Determine street (approximate)
      if (distance < 200) {
        return `${clockPos}:00 & Center`;
      } else if (distance < 400) {
        return `${clockPos}:00 & Esplanade`;
      } else if (distance < 800) {
        const street = String.fromCharCode(65 + Math.floor((distance - 400) / 100)); // A, B, C, etc.
        return `${clockPos}:00 & ${street}`;
      } else {
        return `${clockPos}:00 & Outer Playa`;
      }
    }
  },

  // Create custom cube icon
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
  },

  // Create route polyline with direction arrows
  createRoutePolyline: function(coordinates, map) {
    if (!coordinates || coordinates.length < 2) return null;
    
    const polyline = L.polyline(coordinates, {
      color: '#4ecdc4',
      weight: 4,
      opacity: 0.8,
      dashArray: '10,5'
    });
    
    // Add direction arrows (simplified)
    const decorator = L.polylineDecorator(polyline, {
      patterns: [{
        offset: 25,
        repeat: 50,
        symbol: L.Symbol.arrowHead({
          pixelSize: 8,
          pathOptions: {
            fillOpacity: 0.8,
            color: '#4ecdc4',
            weight: 0
          }
        })
      }]
    });
    
    return { polyline, decorator };
  },

  // Debug logging
  log: function(message, data) {
    if (console && console.log) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`, data || '');
    }
  },

  error: function(message, error) {
    if (console && console.error) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ERROR: ${message}`, error || '');
    }
  }
};

// Add polyline decorator if not available
if (typeof L.polylineDecorator === 'undefined') {
  // Simplified fallback - just return the polyline
  window.MapUtils.createRoutePolyline = function(coordinates, map) {
    if (!coordinates || coordinates.length < 2) return null;
    
    const polyline = L.polyline(coordinates, {
      color: '#4ecdc4',
      weight: 4,
      opacity: 0.8,
      dashArray: '10,5'
    });
    
    return { polyline, decorator: null };
  };
}