#!/bin/sh
echo "⚙️ Luma Horizon — Queue Worker"

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -t 2 2>/dev/null; do sleep 1; done
echo "✅ PostgreSQL listo"

until php -r "try { (new Redis())->connect('$REDIS_HOST', (int)'$REDIS_PORT'); echo 'OK'; } catch (\Exception \$e) { exit(1); }" 2>/dev/null; do sleep 1; done
echo "✅ Redis listo"

cd /app
echo "🔥 Iniciando Laravel Horizon..."
exec php artisan horizon
