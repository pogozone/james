#!/usr/bin/env bash
set -euo pipefail

# MongoDB Backup script for James
# Reads connection and retention settings from environment variables.
# All config can be overridden via environment:
#   MONGODB_URI     full MongoDB connection string (required if not set)
#   BACKUP_DIR      target directory (default: ./backups)
#   KEEP_DAYS       retention in days, 0 = keep forever (default: 14)
#   DB_NAME         explicit database name (default: extracted from MONGODB_URI)

MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/james-todos}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

if ! command -v mongodump &> /dev/null; then
  echo "Error: mongodump not found in PATH" >&2
  exit 1
fi

DB_NAME="${DB_NAME:-$(echo "$MONGODB_URI" | sed -n 's|.*/\([^/?]*\).*|$\1|p')}"
if [ -z "$DB_NAME" ]; then
  echo "Error: Could not extract database name from MONGODB_URI" >&2
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${DB_NAME}_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

echo "Creating backup of $DB_NAME at $BACKUP_PATH ..."
mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --out="$BACKUP_PATH" --gzip

echo "Compressing backup ..."
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

echo "Backup created: ${BACKUP_PATH}.tar.gz"

if [ "$KEEP_DAYS" -gt 0 ]; then
  echo "Removing backups older than $KEEP_DAYS days ..."
  find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}_*.tar.gz" -type f -mtime +"$KEEP_DAYS" -print -delete
fi
