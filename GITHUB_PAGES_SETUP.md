# GitHub Pages Setup for Static Cube Map

## Quick Setup

1. **Push this repo** to GitHub
2. **Set repository secret** `PLAYA_API_URL` to your Rails app URL (e.g., `http://100.104.211.107:3000`)
3. **Enable GitHub Pages** in repo Settings → Pages → Source: GitHub Actions
4. **Run workflow** manually or wait for automatic 5-minute updates

## How it works

- **GitHub Action** runs every 5 minutes
- **Fetches GPS data** from your Playa Rails API
- **Generates static HTML** with embedded data
- **Deploys to GitHub Pages** automatically

## Benefits

✅ **Free hosting** - GitHub Pages is free  
✅ **Global CDN** - Fast loading worldwide  
✅ **Zero maintenance** - Fully automated  
✅ **Offline resilient** - Falls back to last known location  
✅ **Perfect for 20+ viewers** - No server required  

## Repository Settings

### Secrets
- `PLAYA_API_URL`: `http://100.104.211.107:3000` (your Rails app)

### Pages Configuration
- **Source**: GitHub Actions
- **Branch**: Not applicable (uses Actions)

## URL
Your map will be available at:
`https://yourusername.github.io/external_cube_map/`

## Manual Trigger
You can manually update the map by running the "Update Cube Map" workflow in the Actions tab.

## Troubleshooting

### Map not updating
- Check Actions tab for failed workflows
- Verify `PLAYA_API_URL` secret is set correctly
- Ensure your Rails app API is accessible

### Location shows as offline
- Normal when Playa satellite connection is down
- Will show last known location
- Will resume when connection restored

## Monitoring
- Check the Actions tab for update logs
- Map shows status indicator (blue = static mode)
- Bottom banner shows "Static Mode" indicator