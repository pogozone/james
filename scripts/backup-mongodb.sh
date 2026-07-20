#!/usr/bin/env bash

set -Eeuo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017}"
MONGODB_DATABASE="${MONGODB_DATABASE:-james-todos}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
BACKUP_FILE="${BACKUP_DIR}/${MONGODB_DATABASE}_${TIMESTAMP}.archive.gz"

command -v mongodump >/dev/null 2>&1 || {
    echo "Fehler: mongodump ist nicht installiert." >&2
    exit 1
}

mkdir -p "$BACKUP_DIR"

echo "Erstelle Backup der Datenbank '${MONGODB_DATABASE}' ..."

mongodump \
    --uri="$MONGODB_URI" \
    --db="$MONGODB_DATABASE" \
    --archive="$BACKUP_FILE" \
    --gzip

echo "Backup erstellt:"
echo "$BACKUP_FILE"

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS > 0 )); then
    echo "Lösche Backups, die älter als ${RETENTION_DAYS} Tage sind ..."

    find "$BACKUP_DIR" \
        -type f \
        -name "${MONGODB_DATABASE}_*.archive.gz" \
        -mtime "+${RETENTION_DAYS}" \
        -delete
fi