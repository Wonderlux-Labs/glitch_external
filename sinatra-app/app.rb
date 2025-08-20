#!/usr/bin/env ruby
# frozen_string_literal: true

require 'sinatra'
require 'sinatra/reloader' if development?
require 'json'
require 'net/http'
require 'uri'

# External Cube Map App
# Lightweight Sinatra app for displaying GlitchCube location on external servers
class ExternalCubeMapApp < Sinatra::Base
  # Configuration
  set :public_folder, 'public'
  set :views, 'views'
  set :show_exceptions, true

  # Auto-reload in development
  configure :development do
    register Sinatra::Reloader
  end

  # Configuration - should be set via environment variables
  GLITCHCUBE_API_BASE = ENV['GLITCHCUBE_API_URL'] || 'http://localhost:4567'
  UPDATE_INTERVAL = ENV['UPDATE_INTERVAL_SECONDS']&.to_i || 300 # 5 minutes default for frontend
  CACHE_DURATION = ENV['CACHE_DURATION_SECONDS']&.to_i || 300 # 5 minutes default

  # In-memory cache for location data
  @@location_cache = {
    data: nil,
    last_fetch: nil,
    mutex: Mutex.new
  }

  # CORS headers for any API calls
  before '/api/*' do
    headers 'Access-Control-Allow-Origin' => '*'
    headers 'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS'
    headers 'Access-Control-Allow-Headers' => 'Content-Type'
  end

  # Handle preflight CORS requests
  options '/api/*' do
    200
  end

  # Main map page
  get '/' do
    erb :map, locals: {
      glitchcube_api_url: GLITCHCUBE_API_BASE,
      update_interval: UPDATE_INTERVAL
    }
  end

  # API endpoint to get cached GlitchCube location
  get '/api/cube_location' do
    content_type :json

    # Add cache headers for client-side caching
    headers 'Cache-Control' => 'public, max-age=60' # 1 minute client cache

    json(get_cached_location)
  end

  # Serve bundled GeoJSON files
  get '/api/geojson/:dataset' do |dataset|
    content_type :json

    # Validate dataset name to prevent path traversal
    unless dataset.match?(/\A[a-z0-9_]+\z/)
      status 400
      return json({ error: 'Invalid dataset name' })
    end

    geojson_file = File.join('public', 'geojson', "#{dataset}.geojson")

    if File.exist?(geojson_file)
      # Cache static files for 1 hour
      headers 'Cache-Control' => 'public, max-age=3600'
      send_file geojson_file
    else
      status 404
      json({ error: "Dataset '#{dataset}' not found" })
    end
  end

  # Health check endpoint
  get '/health' do
    content_type :json

    # Get cache status
    cache_status = @@location_cache[:mutex].synchronize do
      {
        has_data: !@@location_cache[:data].nil?,
        last_fetch: @@location_cache[:last_fetch]&.utc&.iso8601,
        cache_age: @@location_cache[:last_fetch] ? (Time.now - @@location_cache[:last_fetch]).round(1) : nil,
        is_fresh: @@location_cache[:last_fetch] && (Time.now - @@location_cache[:last_fetch]) < CACHE_DURATION
      }
    end

    json({
           status: 'ok',
           app: 'External Cube Map',
           version: '1.0.0',
           glitchcube_api_url: GLITCHCUBE_API_BASE,
           update_interval: UPDATE_INTERVAL,
           cache_duration: CACHE_DURATION,
           cache_status: cache_status,
           timestamp: Time.now.utc.iso8601
         })
  end

  # Serve map view
  get '/map' do
    redirect '/'
  end

  # Handle 404s
  not_found do
    if request.accept.include?('application/json')
      content_type :json
      json({ error: 'Not found', path: request.path })
    else
      erb :not_found
    end
  end

  # Handle 500s
  error do
    err = env['sinatra.error']
    if request.accept.include?('application/json')
      content_type :json
      json({
             error: 'Internal server error',
             message: err.message,
             timestamp: Time.now.utc.iso8601
           })
    else
      erb :error, locals: { error: err }
    end
  end

  private

  # Get cached location data, fetching from API if cache is stale
  def get_cached_location
    @@location_cache[:mutex].synchronize do
      now = Time.now

      # Check if cache is fresh (within CACHE_DURATION)
      if @@location_cache[:data] &&
         @@location_cache[:last_fetch] &&
         (now - @@location_cache[:last_fetch]) < CACHE_DURATION

        # Return cached data with cache metadata
        return @@location_cache[:data].merge({
                                               cached: true,
                                               cache_age: (now - @@location_cache[:last_fetch]).round(1),
                                               cache_expires_in: (CACHE_DURATION - (now - @@location_cache[:last_fetch])).round(1)
                                             })
      end

      # Cache is stale or empty, fetch fresh data
      fresh_data = fetch_location_from_api

      if fresh_data[:error]
        # API failed - return cached data if we have it, otherwise return error
        return fresh_data unless @@location_cache[:data]

        return @@location_cache[:data].merge({
                                               cached: true,
                                               stale: true,
                                               cache_age: @@location_cache[:last_fetch] ? (now - @@location_cache[:last_fetch]).round(1) : nil,
                                               api_error: fresh_data[:error]
                                             })

      end

      # Successfully fetched fresh data
      @@location_cache[:data] = fresh_data
      @@location_cache[:last_fetch] = now

      fresh_data.merge({
                         cached: false,
                         fetched_at: now.utc.iso8601
                       })
    end
  end

  # Fetch location from main GlitchCube API
  def fetch_location_from_api
    uri = URI("#{GLITCHCUBE_API_BASE}/api/v1/gps/location.json")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    http.read_timeout = 30

    request = Net::HTTP::Get.new(uri)
    response = http.request(request)

    if response.code == '200'
      JSON.parse(response.body)

    else
      {
        error: 'Failed to fetch cube location',
        status: response.code.to_i,
        message: response.body
      }
    end
  rescue Net::HTTPServerError => e
    {
      error: 'Connection timeout',
      message: 'Could not connect to GlitchCube API',
      details: e.message
    }
  rescue JSON::ParserError => e
    {
      error: 'Invalid response format',
      message: 'GlitchCube API returned invalid JSON',
      details: e.message
    }
  rescue StandardError => e
    {
      error: 'Internal server error',
      message: e.message,
      timestamp: Time.now.utc.iso8601
    }
  end

  def json(data)
    JSON.pretty_generate(data)
  end
end

# Run the app if this file is executed directly
if __FILE__ == $PROGRAM_NAME
  ExternalCubeMapApp.set :port, ENV['PORT'] || 9292
  ExternalCubeMapApp.run!
end
