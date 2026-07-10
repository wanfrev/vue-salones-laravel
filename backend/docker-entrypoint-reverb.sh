#!/bin/sh
set -e

echo "🔊 Luma Reverb — WebSocket Server"

if [ -n "$DB_HOST" ]; then
    echo "⏳ Esperando PostgreSQL..."
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -t 3 2>/dev/null; do sleep 1; done
    echo "✅ PostgreSQL listo"
fi

if [ -n "$REDIS_HOST" ]; then
    echo "⏳ Esperando Redis..."
    until redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping 2>/dev/null | grep -q PONG; do sleep 1; done
    echo "✅ Redis listo"
fi

cd /app

echo "🔥 Iniciando Reverb WebSocket Server..."
exec php artisan reverb:start --debug
