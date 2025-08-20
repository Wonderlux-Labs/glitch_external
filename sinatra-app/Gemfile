# frozen_string_literal: true

source 'https://rubygems.org'

ruby '~> 3.0'

# Web framework
gem 'sinatra', '~> 4.0'
gem 'sinatra-contrib', '~> 4.0'

# Web server
gem 'puma', '~> 6.0'

# JSON handling
gem 'json', '~> 2.6'

group :development do
  # Auto-reload in development
  gem 'sinatra-reloader', require: false

  # Development tools
  gem 'rubocop', require: false
end

group :production do
  # Production optimizations
  gem 'rack', '~> 3.0'
end
