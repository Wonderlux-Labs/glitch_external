FROM ruby:3.0-alpine

# Install dependencies
RUN apk add --no-cache \
    build-base \
    curl \
    tzdata

# Set working directory
WORKDIR /app

# Copy Gemfile and install dependencies
COPY Gemfile* ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install --jobs 4 --retry 3

# Copy application files
COPY . .

# Create non-root user
RUN adduser -D -u 1000 glitchcube && \
    chown -R glitchcube:glitchcube /app

# Switch to non-root user
USER glitchcube

# Expose port
EXPOSE 9292

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9292/health || exit 1

# Default environment variables
ENV GLITCHCUBE_API_URL=http://100.104.211.107:4567 \
    UPDATE_INTERVAL_SECONDS=120 \
    PORT=9292 \
    RACK_ENV=production

# Start the application
CMD ["bundle", "exec", "puma", "config.ru", "-p", "9292"]