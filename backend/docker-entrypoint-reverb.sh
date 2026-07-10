#!/bin/sh
echo "🔊 Luma Reverb — WebSocket Server"

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -t 2 2>/dev/null; do sleep 1; done
echo "✅ PostgreSQL listo"

cd /app
echo "🔥 Iniciando Reverb..."
exec php artisan reverb:start --debug
