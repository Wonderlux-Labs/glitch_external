#!/bin/bash

# GlitchCube External Map Deployment Script
# For use with Tailscale network

echo "🎲 GlitchCube External Map Deployment"
echo "======================================"

# Configuration
GLITCHCUBE_INTERNAL_IP="100.104.211.107"
GLITCHCUBE_PORT="4567"
EXTERNAL_PORT="${PORT:-9292}"
UPDATE_INTERVAL="${UPDATE_INTERVAL_SECONDS:-120}"

# Check if we're on Tailscale network
if command -v tailscale &> /dev/null; then
    echo "✓ Tailscale detected"
    tailscale_status=$(tailscale status --json 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✓ Tailscale connected"
    else
        echo "⚠️  Warning: Tailscale not connected. The app may not be able to reach the internal API."
    fi
else
    echo "⚠️  Warning: Tailscale not installed. The app requires Tailscale to reach the internal API."
fi

# Test connectivity to main app
echo ""
echo "Testing connection to main GlitchCube app..."
if curl -s --connect-timeout 5 "http://${GLITCHCUBE_INTERNAL_IP}:${GLITCHCUBE_PORT}/health" > /dev/null 2>&1; then
    echo "✓ Successfully connected to GlitchCube at ${GLITCHCUBE_INTERNAL_IP}:${GLITCHCUBE_PORT}"
else
    echo "❌ Cannot reach GlitchCube at ${GLITCHCUBE_INTERNAL_IP}:${GLITCHCUBE_PORT}"
    echo "   Please ensure:"
    echo "   1. The main GlitchCube app is running"
    echo "   2. This server is connected to the Tailscale network"
    echo "   3. The IP address is correct"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Set environment variables
export GLITCHCUBE_API_URL="http://${GLITCHCUBE_INTERNAL_IP}:${GLITCHCUBE_PORT}"
export UPDATE_INTERVAL_SECONDS="${UPDATE_INTERVAL}"
export PORT="${EXTERNAL_PORT}"
export RACK_ENV="${RACK_ENV:-production}"

echo ""
echo "Configuration:"
echo "  Main App URL: ${GLITCHCUBE_API_URL}"
echo "  Update Interval: ${UPDATE_INTERVAL_SECONDS}s"
echo "  External Port: ${PORT}"
echo "  Environment: ${RACK_ENV}"
echo ""

# Install dependencies if needed
if [ ! -d "vendor/bundle" ]; then
    echo "Installing dependencies..."
    bundle install --deployment --without development test
fi

# Start the application
echo "Starting External Cube Map on port ${PORT}..."
echo "Access the map at: http://$(hostname -I | cut -d' ' -f1):${PORT}"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Run with Puma
bundle exec puma config.ru -p ${PORT} -e ${RACK_ENV}