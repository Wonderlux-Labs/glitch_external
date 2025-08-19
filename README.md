# GlitchCube External Map Tracker

A lightweight external map application that displays the real-time location of the GlitchCube at Burning Man 2025.

## Overview

This is a standalone Sinatra application designed to run on external servers to display the GlitchCube's live location. It features intelligent server-side caching that reduces API load by only fetching location updates every 5 minutes, regardless of visitor count.

## Features

- **Efficient Location Tracking**: Shows GlitchCube's current position with server-side caching (5-minute updates, shared across all visitors)
- **Rich Context Information**: Displays BRC addresses, nearby landmarks, and proximity data
- **Interactive Map**: Full Leaflet.js-powered map with zoom, pan, and layer controls
- **Route History**: Optional display of travel path with directional indicators
- **Burning Man GIS Data**: Complete dataset including landmarks, streets, toilets, and boundaries
- **Responsive Design**: Works on desktop and mobile devices
- **Keyboard Shortcuts**: Quick navigation and control
- **Offline Resilience**: Graceful handling of connection issues

## Architecture

### Backend (Ruby/Sinatra)
- Lightweight Sinatra application
- Proxies requests to main GlitchCube API
- Serves bundled GeoJSON data
- CORS-enabled for external deployment

### Frontend (JavaScript/Leaflet)
- Modular JavaScript architecture
- Leaflet.js for map rendering
- Real-time data updates
- Interactive controls and status indicators

### Data Flow
```
External Map App → Poll Main GlitchCube API → Update Map Display
     ↓
Bundle GeoJSON Files → Serve Static Map Data
```

## Installation

1. **Clone and setup**:
   ```bash
   cd external_cube_map
   bundle install
   ```

2. **Configure environment**:
   ```bash
   # For production (using Tailscale IP)
   export GLITCHCUBE_API_URL="http://100.104.211.107:4567"
   export UPDATE_INTERVAL_SECONDS=300  # 5 minutes (frontend polling)
   export CACHE_DURATION_SECONDS=300   # 5 minutes (server-side cache)
   
   # For local development
   # export GLITCHCUBE_API_URL="http://localhost:4567"
   ```

3. **Run the application**:
   ```bash
   # Development
   ruby app.rb
   
   # Production with Puma
   bundle exec puma config.ru
   ```

## Configuration

### Environment Variables

- `GLITCHCUBE_API_URL`: Base URL of the main GlitchCube application (required)
- `UPDATE_INTERVAL_SECONDS`: Frontend polling interval in seconds (default: 300)
- `CACHE_DURATION_SECONDS`: Server-side cache duration in seconds (default: 300)
- `RACK_ENV`: Environment mode (development/production)

### Example Production Setup

```bash
# Using Tailscale internal network
export GLITCHCUBE_API_URL="http://100.104.211.107:4567"
export UPDATE_INTERVAL_SECONDS=300
export CACHE_DURATION_SECONDS=300
export RACK_ENV=production
export PORT=9292  # External app port

bundle exec puma config.ru
```

### Tailscale Network Notes

The production GlitchCube Sinatra app runs at `100.104.211.107:4567` on the Tailscale network. The external map app should be deployed on a server that:

1. Has Tailscale installed and connected to the same network
2. Can reach the internal IP `100.104.211.107`
3. Is exposed to the public internet on its own port (e.g., 9292)

This setup ensures the external map app can poll the main app internally while being accessible externally.

## API Endpoints

### External App Endpoints

- `GET /` - Main map interface
- `GET /api/cube_location` - Proxied location data from main app
- `GET /api/geojson/:dataset` - Bundled GeoJSON files
- `GET /health` - Health check endpoint

### Main App Integration

The external app connects to these endpoints on the main GlitchCube app:

- `GET /api/v1/gps/location.json` - Rich location data with proximity context

## GeoJSON Datasets

Bundled datasets in `/public/geojson/`:

- `burning_man_landmarks.json` - All landmarks and points of interest
- `trash_fence.geojson` - Event perimeter boundary
- `street_lines.geojson` - Street centerlines
- `city_blocks.geojson` - City block boundaries  
- `toilets.geojson` - Portable toilet locations
- `plazas.geojson` - Plaza areas
- `cpns.geojson` - Center Placement Names (camps)

## Map Controls

### Interactive Buttons
- **📍 Center**: Focus map on cube location
- **📍 Route**: Toggle route history display
- **🏛️ Landmarks**: Toggle landmark visibility
- **🛣️ Streets**: Toggle street display
- **🧭 Compass**: Center on The Man (Golden Spike)

### Keyboard Shortcuts
- `C` - Center on cube
- `R` - Toggle route history
- `L` - Toggle landmarks
- `S` - Toggle streets
- `M` - Center on The Man

## Deployment Options

### Docker
```dockerfile
FROM ruby:3.0-alpine

WORKDIR /app
COPY Gemfile* ./
RUN bundle install --without development test

COPY . .
EXPOSE 9292

CMD ["bundle", "exec", "puma", "config.ru"]
```

### Systemd Service
```ini
[Unit]
Description=GlitchCube External Map
After=network.target

[Service]
Type=simple
User=glitchcube
WorkingDirectory=/opt/external_cube_map
Environment=GLITCHCUBE_API_URL=https://glitchcube.burningman.org
Environment=RACK_ENV=production
ExecStart=/usr/local/bin/bundle exec puma config.ru
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Proxy
```nginx
server {
    listen 80;
    server_name cubemap.example.com;
    
    location / {
        proxy_pass http://127.0.0.1:9292;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /geojson/ {
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

## Development

### File Structure
```
external_cube_map/
├── app.rb                    # Main Sinatra application
├── config.ru                 # Rack configuration
├── Gemfile                   # Ruby dependencies
├── public/
│   ├── javascripts/          # Frontend JavaScript modules
│   ├── stylesheets/          # CSS styles
│   └── geojson/              # Bundled GIS data
└── views/
    └── map.erb               # Main HTML template
```

### JavaScript Modules

- `main.js` - Application initialization
- `map_setup.js` - Leaflet map configuration
- `map_data.js` - API communication and caching
- `cube_tracker.js` - Cube location visualization
- `map_controls.js` - UI controls and status updates
- `map_utils.js` - Utility functions and BRC coordinates

### Adding New Features

1. **New GeoJSON Layer**: Add file to `/public/geojson/` and update `map_setup.js`
2. **New Controls**: Add button to HTML and handler in `map_controls.js`
3. **API Changes**: Update `map_data.js` and backend proxy in `app.rb`

## Troubleshooting

### Connection Issues
- Check `GLITCHCUBE_API_URL` environment variable
- Verify main GlitchCube app is accessible
- Check CORS headers in main app

### Map Not Loading
- Verify GeoJSON files are present in `/public/geojson/`
- Check browser console for JavaScript errors
- Ensure Leaflet.js CDN is accessible

### Performance
- Adjust `UPDATE_INTERVAL_SECONDS` for more/less frequent updates
- Consider caching static files with CDN
- Monitor memory usage with large route histories

## Monitoring

The application provides several monitoring endpoints:

- `GET /health` - Basic health check
- Browser console logs for debugging
- Automatic retry logic for failed API calls

## Security Notes

- No authentication required (read-only display)
- CORS enabled for cross-origin requests
- Static file serving with appropriate headers
- No sensitive data stored or transmitted

## License

Part of the GlitchCube project for Burning Man 2025.

---

**🎲 Keep the art alive, even when the network fails! 🔥**