#!/bin/sh
echo "🚀 Luma Web — Iniciando..."

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_DATABASE="${DB_DATABASE:-salones}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "⏳ Esperando PostgreSQL ($DB_HOST:$DB_PORT)..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -t 2 2>/dev/null; do sleep 1; done
echo "✅ PostgreSQL listo"

echo "⏳ Esperando Redis ($REDIS_HOST:$REDIS_PORT)..."
until php -r "try { (new Redis())->connect('$REDIS_HOST', (int)'$REDIS_PORT'); echo 'OK'; } catch (\Exception \$e) { exit(1); }" 2>/dev/null; do sleep 1; done
echo "✅ Redis listo"

cd /app

php artisan config:cache 2>/dev/null || echo "⚠️ config:cache skipped"
php artisan route:cache 2>/dev/null || echo "⚠️ route:cache skipped"
php artisan storage:link --force 2>/dev/null || true

echo "🔥 Iniciando Laravel Octane + FrankenPHP..."
exec php artisan octane:frankenphp --workers=${OCTANE_WORKERS:-3} --max-execution-time=${OCTANE_MAX_EXECUTION_TIME:-60}
