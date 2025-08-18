#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative 'app'

# Enable Rack::Static to serve static files
use Rack::Static,
    urls: ['/stylesheets', '/javascripts', '/images', '/geojson'],
    root: 'public'

# Run the app
run ExternalCubeMapApp
