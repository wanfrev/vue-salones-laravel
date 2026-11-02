#!/bin/bash
# Arma el paquete CIFRADO de respaldo de Luma, listo para sacarlo del servidor.
# Corre por cron a las 03:20, después de backup-postgres.sh (03:00), y reutiliza sus dumps.
#
# Contenido del paquete luma-AAAAMMDD_HHMMSS.tar.age:
#   db/salones.dump, db/evolution_db.dump   los dumps más recientes (ya verificados)
#   db/globals.sql                          roles de Postgres
#   .env                                    contiene el APP_KEY: sin él las notas y adjuntos
#                                           clínicos cifrados NO se pueden recuperar
#   storage/app                             archivos subidos (adjuntos)
#   etc/nginx, php hardening, crontab       para reconstruir el servidor
#
# Cifrado con age usando solo la clave PÚBLICA (/etc/luma-backup/recipients.txt). La clave
# privada vive en tu PC: aunque el servidor sea comprometido, los respaldos viejos no se leen.
#
# Cada ejecución deja en $OUT_DIR/STATUS una línea "OK ..." o "FAIL ..." que revisa el script
# de tu PC. Para correrlo a mano fuera del horario: MAX_DUMP_AGE_MIN=100000 luma-offsite-bundle.sh
set -Eeuo pipefail
umask 077

SRC_DIR="${SRC_DIR:-/var/backups/postgres}"
OUT_DIR="${OUT_DIR:-/var/backups/luma-offsite}"
APP_DIR="${APP_DIR:-/var/www/vue-salones-laravel/backend}"
NGINX_DIR="${NGINX_DIR:-/etc/nginx}"
PHP_INI="${PHP_INI:-/etc/php/8.4/mods-available/zz-hardening.ini}"
RECIPIENTS="${RECIPIENTS:-/etc/luma-backup/recipients.txt}"
GROUP="${GROUP:-lumabackup}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MAX_DUMP_AGE_MIN="${MAX_DUMP_AGE_MIN:-240}"
MIN_SALONES_BYTES="${MIN_SALONES_BYTES:-100000}"
MIN_BUNDLE_BYTES="${MIN_BUNDLE_BYTES:-1000000}"

STAMP=$(date +%Y%m%d_%H%M%S)
LOG="$OUT_DIR/bundle.log"
STATUS="$OUT_DIR/STATUS"
WORK=""
OUT=""

mkdir -p "$OUT_DIR"
log() { echo "[$(date -Is)] $*" >> "$LOG"; }

# El usuario de descarga (lumabackup) solo lee la carpeta; los archivos ya van cifrados.
fix_perms() {
  if getent group "$GROUP" >/dev/null 2>&1; then
    chgrp "$GROUP" "$OUT_DIR" 2>/dev/null || true
    chmod 750 "$OUT_DIR"
    local f
    for f in "$OUT_DIR"/STATUS "$OUT_DIR"/luma-*.tar.age "$OUT_DIR"/luma-*.sha256; do
      if [ -e "$f" ]; then chgrp "$GROUP" "$f"; chmod 640 "$f"; fi
    done
  fi
  return 0
}

cleanup() { if [ -n "$WORK" ]; then rm -rf "$WORK"; fi; return 0; }
fail() {
  trap - ERR
  log "ERROR: $*"
  echo "FAIL $(date -Is) $*" > "$STATUS"
  if [ -n "$OUT" ]; then rm -f "$OUT.part"; fi
  fix_perms
  exit 1
}
trap cleanup EXIT
trap 'fail "fallo inesperado (línea $LINENO)"' ERR

command -v age >/dev/null || fail "age no está instalado (apt install age)"
[ -s "$RECIPIENTS" ] || fail "falta la clave pública en $RECIPIENTS"

latest() { ls -t "$SRC_DIR"/"$1"_2*.dump 2>/dev/null | head -1 || true; }
SALONES=$(latest salones)
EVO=$(latest evolution_db)
[ -n "$SALONES" ] || fail "no hay dump de salones en $SRC_DIR"
[ -n "$EVO" ] || fail "no hay dump de evolution_db en $SRC_DIR"

for f in "$SALONES" "$EVO"; do
  [ -n "$(find "$f" -mmin -"$MAX_DUMP_AGE_MIN")" ] \
    || fail "$(basename "$f") tiene más de $MAX_DUMP_AGE_MIN min: el respaldo nocturno no corrió"
  pg_restore -l "$f" >/dev/null 2>&1 || fail "$(basename "$f") está dañado (pg_restore -l falla)"
done
[ "$(stat -c%s "$SALONES")" -gt "$MIN_SALONES_BYTES" ] || fail "el dump de salones es sospechosamente pequeño"

WORK=$(mktemp -d)
mkdir -p "$WORK/db" "$WORK/misc"
ln -s "$SALONES" "$WORK/db/salones.dump"
ln -s "$EVO" "$WORK/db/evolution_db.dump"
sudo -u postgres pg_dumpall --globals-only > "$WORK/db/globals.sql"
crontab -l > "$WORK/misc/root-crontab.txt" 2>/dev/null || true
cp /usr/local/bin/backup-postgres.sh "$WORK/misc/" 2>/dev/null || true

OUT="$OUT_DIR/luma-$STAMP.tar.age"
# -h sigue los enlaces simbólicos (los dumps y los sites-enabled de nginx entran como archivos).
tar --warning=no-file-changed -chf - -C "$WORK" db misc \
    -C "$APP_DIR" .env storage/app \
    -C / "${NGINX_DIR#/}" "${PHP_INI#/}" \
  | age -R "$RECIPIENTS" -o "$OUT.part"
mv "$OUT.part" "$OUT"

[ "$(head -c 21 "$OUT")" = "age-encryption.org/v1" ] || fail "el paquete no tiene cabecera age"
SIZE=$(stat -c%s "$OUT")
[ "$SIZE" -gt "$MIN_BUNDLE_BYTES" ] || fail "el paquete es sospechosamente pequeño ($SIZE bytes)"
(cd "$OUT_DIR" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256")

find "$OUT_DIR" -maxdepth 1 -name 'luma-*.tar.age*' -mtime +"$RETENTION_DAYS" -delete
find "$OUT_DIR" -maxdepth 1 -name '*.part' -mmin +60 -delete

echo "OK $(date -Is) $(basename "$OUT") $SIZE" > "$STATUS"
fix_perms
log "OK $(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
