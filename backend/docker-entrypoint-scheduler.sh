#!/bin/sh
set -e

echo "📅 Luma Scheduler"

if [ -n "$DB_HOST" ]; then
    echo "⏳ Esperando PostgreSQL..."
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -t 3 2>/dev/null; do sleep 1; done
    echo "✅ PostgreSQL listo"
fi

cd /app

echo "🔥 Iniciando Laravel Scheduler..."
exec php artisan schedule:work
