#!/bin/bash
# Despliegue de Luma (prod / staging) — versión con protecciones.
#
# Qué agrega respecto a la versión anterior de /usr/local/bin/deploy-luma.sh:
#   1. `artisan` corre como el usuario web (www-data), no como root, para que los archivos de
#      caché/vistas/logs que crea NO queden con dueño root (eso rompía el login: PHP-FPM no podía
#      escribir en carpetas de storage/framework/cache creadas por root).
#   2. Red de seguridad: chown de storage/ y bootstrap/cache/ al usuario web antes y después.
#   3. Pruebas al final: el sitio responde 200 Y un login vacío responde 422 (si da 500, el deploy
#      falla en voz alta en vez de decir «completado»). Los servicios deben quedar activos.
#
# Instalación (revisar el diff antes):
#   diff /usr/local/bin/deploy-luma.sh /var/www/vue-salones-laravel/scripts/deploy/deploy-luma.sh
#   cp /var/www/vue-salones-laravel/scripts/deploy/deploy-luma.sh /usr/local/bin/deploy-luma.sh
#   chmod +x /usr/local/bin/deploy-luma.sh
set -Eeuo pipefail
# Si algo falla a mitad del deploy, dice en qué línea (antes se detenía sin explicación).
trap 'echo "!!! El deploy se detuvo: falló la línea $LINENO" >&2' ERR

WEB_USER="www-data"
WEB_GROUP="www-data"

# chown, runuser y systemctl necesitan root: mejor avisar al inicio que fallar después de `git pull`.
if [ "$(id -u)" != "0" ]; then
    echo "Este script debe ejecutarse como root." >&2
    exit 1
fi

# Un solo deploy a la vez (dos simultáneos pisarían composer, npm y el build).
exec 9>/var/lock/deploy-luma.lock
if ! flock -n 9; then
    echo "Ya hay un deploy en curso. Espera a que termine." >&2
    exit 1
fi

ENV="${1:-}"
if [ "$ENV" = "prod" ]; then
    DIR="/var/www/vue-salones-laravel"
    URL="https://lumasystem.online"
    SERVICES="luma-horizon luma-reverb"
elif [ "$ENV" = "staging" ]; then
    DIR="/var/www/luma-staging"
    URL="https://staging.lumasystem.online"
    SERVICES="luma-staging-horizon luma-staging-reverb"
else
    echo "Uso: deploy-luma.sh [prod|staging]"
    exit 1
fi

# Ejecuta un comando como el usuario web (artisan nunca como root: ver arriba).
as_web() { runuser -u "$WEB_USER" -- "$@"; }

# Deja storage/ y bootstrap/cache/ escribibles por PHP-FPM, pase lo que pase antes.
fix_permissions() {
    chown -R "$WEB_USER:$WEB_GROUP" "$DIR/backend/storage" "$DIR/backend/bootstrap/cache"
    chmod -R ug+rwX "$DIR/backend/storage" "$DIR/backend/bootstrap/cache"
}

echo ">>> Backup de seguridad antes de desplegar..."
/usr/local/bin/backup-postgres.sh

echo ">>> Desplegando $ENV en $DIR"
cd "$DIR"
git pull

echo ">>> Backend..."
cd "$DIR/backend"
composer install --no-dev --optimize-autoloader
# composer corre como root y toca bootstrap/cache (package:discover): se arregla ANTES de artisan.
fix_permissions
as_web php artisan migrate --force
as_web php artisan config:cache
as_web php artisan route:cache
as_web php artisan event:cache

echo ">>> Frontend..."
cd "$DIR/client"
npm install --legacy-peer-deps
npm run build

echo ">>> Reiniciando servicios..."
fix_permissions
systemctl reload php8.4-fpm
# shellcheck disable=SC2086
systemctl restart $SERVICES

echo ">>> Verificando..."
sleep 3
FAILED=0

# `|| true`: si curl no puede conectar, el código queda en 000 y se reporta abajo (sin esto, `set -e`
# cortaba el script en silencio).
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || true)
echo ">>> $URL respondió: $STATUS (esperado 200)"
[ "$STATUS" = "200" ] || FAILED=1

# Un login vacío no inicia sesión ni cambia nada: debe fallar la VALIDACIÓN (422). Un 500 significa
# que el backend está roto (permisos de storage, base de datos, configuración…).
LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/api/auth/login" \
    -H "Content-Type: application/json" -H "Accept: application/json" -d '{}' || true)
echo ">>> POST /api/auth/login vacío respondió: $LOGIN (esperado 422)"
[ "$LOGIN" = "422" ] || FAILED=1

for svc in $SERVICES; do
    if systemctl is-active --quiet "$svc"; then
        echo ">>> $svc: activo"
    else
        echo "!!! $svc NO está activo"
        FAILED=1
    fi
done

if [ "$FAILED" != "0" ]; then
    echo "!!! El deploy terminó con problemas. Revisa $DIR/backend/storage/logs/laravel.log"
    exit 1
fi

echo ">>> Deploy de $ENV completado."
