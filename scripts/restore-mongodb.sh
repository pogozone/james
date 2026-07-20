#!/usr/bin/env bash
set -euo pipefail

# MongoDB Restore script for James
# Reads connection settings from environment variables.
# Usage: ./restore-mongodb.sh <path-to-backup-tar.gz>
#
# Environment:
#   MONGODB_URI     full MongoDB connection string (default: mongodb://127.0.0.1:27017/james-todos)
#   DROP          set to "true" to drop the target database before restore (default: false)

MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/james-todos}"
DROP="${DROP:-false}"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-to-backup-tar.gz>" >&2
  exit 1
fi

ARCHIVE="$1"
if [ ! -f "$ARCHIVE" ]; then
  echo "Error: Backup archive not found: $ARCHIVE" >&2
  exit 1
fi

if ! command -v mongorestore &> /dev/null; then
  echo "Error: mongorestore not found in PATH" >&2
  exit 1
fi

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Extracting backup archive ..."
tar -xzf "$ARCHIVE" -C "$WORK_DIR"

BACKUP_NAME=$(basename "$ARCHIVE" .tar.gz)
RESTORE_DIR="$WORK_DIR/$BACKUP_NAME"

DB_NAME=$(echo "$MONGODB_URI" | sed -n 's|.*/\([^/?]*\).*|$\1|p')
if [ -z "$DB_NAME" ]; then
  echo "Error: Could not extract database name from MONGODB_URI" >&2
  exit 1
fi

DROP_FLAG=""
if [ "$DROP" = "true" ]; then
  DROP_FLAG="--drop"
  echo "Restore will drop existing collections in $DB_NAME"
fi

echo "Restoring database $DB_NAME from $RESTORE_DIR ..."
mongorestore --uri="$MONGODB_URI" --db="$DB_NAME" --gzip $DROP_FLAG "$RESTORE_DIR/$DB_NAME"

echo "Restore completed."
