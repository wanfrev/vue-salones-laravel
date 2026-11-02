#!/bin/bash
# Respaldo diario de las bases de Postgres (cron 03:00 como root).
#
# Misma lógica que el script original de /usr/local/bin/backup-postgres.sh, con tres cambios:
#   - umask 077: los .dump quedan legibles solo por root (antes los podía leer cualquier usuario,
#     incluido www-data, el usuario con el que corre PHP).
#   - Si pg_dump falla se borra el archivo a medias (antes quedaba un .dump vacío o truncado
#     que parecía un respaldo válido).
#   - Sale con código distinto de 0 si alguna base falló, para que el cron lo note.
set -u
umask 077

BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG="$BACKUP_DIR/backup.log"
RETENTION_DAYS=14
DATABASES=(salones salones_staging evolution_db)

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..." >> "$LOG"
failed=0

for DB in "${DATABASES[@]}"; do
    FILE="$BACKUP_DIR/${DB}_${TIMESTAMP}.dump"
    if sudo -u postgres pg_dump -Fc "$DB" > "$FILE" 2>> "$LOG" && [ -s "$FILE" ]; then
        echo "[$(date)] OK: $FILE ($(du -h "$FILE" | cut -f1))" >> "$LOG"
    else
        echo "[$(date)] ERROR respaldando $DB" >> "$LOG"
        rm -f "$FILE"
        failed=1
    fi
done

find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Backup completo (fallos: $failed). Retención: ${RETENTION_DAYS} días." >> "$LOG"
exit $failed
