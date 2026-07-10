#!/bin/sh
set -e

echo "🚀 Luma — Iniciando en producción..."

# Wait for DB
if [ -n "$DB_HOST" ]; then
    echo "⏳ Esperando PostgreSQL ($DB_HOST:$DB_PORT)..."
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_DATABASE" -t 3 2>/dev/null; do
        sleep 1
    done
    echo "✅ PostgreSQL listo"
fi

# Wait for Redis
if [ -n "$REDIS_HOST" ]; then
    echo "⏳ Esperando Redis ($REDIS_HOST:$REDIS_PORT)..."
    until redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping 2>/dev/null | grep -q PONG; do
        sleep 1
    done
    echo "✅ Redis listo"
fi

cd /app

# Optimizaciones de Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Migraciones automáticas (Coolify gestiona esto si prefiere, descomenta si quieres auto-migrar)
# php artisan migrate --force

# Link de storage
php artisan storage:link --force 2>/dev/null || true

# Iniciar Octane con FrankenPHP
echo "🔥 Iniciando Laravel Octane con FrankenPHP..."
exec php artisan octane:frankenphp --workers=${OCTANE_WORKERS:-auto} --max-execution-time=${OCTANE_MAX_EXECUTION_TIME:-60}
