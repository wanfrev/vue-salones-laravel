#!/bin/bash
# Prueba de restauración: restaura el dump más reciente de producción en una base TEMPORAL,
# compara el conteo de filas con producción y borra la base temporal. No toca producción.
# Un respaldo que nunca se restauró no es una garantía: córrelo una vez al mes.
set -uo pipefail

SRC_DIR="${SRC_DIR:-/var/backups/postgres}"
PROD_DB="${PROD_DB:-salones}"
TEST_DB="restore_test_$$"
TABLES=(businesses profiles clients appointments transactions)

f=$(ls -t "$SRC_DIR"/${PROD_DB}_2*.dump 2>/dev/null | head -1)
[ -n "$f" ] || { echo "No hay dumps de $PROD_DB en $SRC_DIR"; exit 1; }
echo "Dump: $f ($(date -r "$f" '+%F %T'))"

sudo -u postgres createdb "$TEST_DB" || exit 1
trap 'sudo -u postgres dropdb --if-exists "$TEST_DB" >/dev/null 2>&1' EXIT

# La redirección la hace root (el dump es 600 root), por eso se pasa por stdin.
errors=$(sudo -u postgres pg_restore -d "$TEST_DB" --no-owner < "$f" 2>&1 | grep -ci "error")
echo "Errores durante la restauración: $errors"

printf "%-14s %12s %12s\n" tabla restaurado produccion
bad=0
for t in "${TABLES[@]}"; do
  r=$(sudo -u postgres psql -At -d "$TEST_DB" -c "select count(*) from $t" 2>/dev/null)
  p=$(sudo -u postgres psql -At -d "$PROD_DB" -c "select count(*) from $t" 2>/dev/null)
  printf "%-14s %12s %12s\n" "$t" "${r:-ERROR}" "${p:-ERROR}"
  [ -z "$r" ] && bad=1
done
echo "(producción puede tener algo más: sigue recibiendo datos después del dump)"
if [ "$bad" = 0 ] && [ "$errors" -eq 0 ]; then echo "RESULTADO: OK"; else echo "RESULTADO: REVISAR"; exit 1; fi
