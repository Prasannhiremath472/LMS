#!/bin/sh
# Nightly MySQL backup for the LMS database. Wire this up as an hPanel cron job:
#   0 2 * * * /bin/sh /home/<user>/lms/backend/scripts/backup.sh >> /home/<user>/lms/backend/logs/backup.log 2>&1
# Reads DB credentials from backend/.env so nothing is duplicated here.

set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$BACKEND_DIR/backups"
KEEP_DAYS=14

# shellcheck disable=SC1091
set -a; . "$BACKEND_DIR/.env"; set +a

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/lms_${STAMP}.sql.gz"

mysqldump \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-3306}" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --single-transaction \
  --routines \
  "$DB_NAME" | gzip > "$OUT_FILE"

find "$BACKUP_DIR" -name 'lms_*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "Backup written to $OUT_FILE"
