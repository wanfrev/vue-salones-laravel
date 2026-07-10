#!/bin/sh
set -e

# Wait for PostgreSQL
if [ -n "$DB_HOST" ]; then
    echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_DATABASE" -t 2 2>/dev/null; do
        sleep 1
    done
    echo "PostgreSQL is ready."
fi

# Wait for Redis
if [ -n "$REDIS_HOST" ]; then
    echo "Waiting for Redis at $REDIS_HOST:${REDIS_PORT:-6379}..."
    until redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping 2>/dev/null | grep -q PONG; do
        sleep 1
    done
    echo "Redis is ready."
fi

cd /app

# Run migrations
echo "Running database migrations..."
php artisan migrate --force --no-interaction

# Cache production config
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan event:cache

# Storage link
php artisan storage:link --force 2>/dev/null || true

# Start Octane with FrankenPHP
echo "Starting Laravel Octane via FrankenPHP..."
exec php artisan octane:frankenphp --workers=${OCTANE_WORKERS:-auto} --max-execution-time=${OCTANE_MAX_EXECUTION_TIME:-60} --caddyfile=/etc/caddy/Caddyfile
