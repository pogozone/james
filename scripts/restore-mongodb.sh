#!/usr/bin/env bash

set -Eeuo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017}"
MONGODB_DATABASE="${MONGODB_DATABASE:-james-todos}"

command -v mongorestore >/dev/null 2>&1 || {
    echo "Fehler: mongorestore ist nicht installiert." >&2
    exit 1
}

if [[ $# -ne 1 ]]; then
    echo "Verwendung:"
    echo "  $0 <backup.archive.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Fehler: Backup-Datei nicht gefunden: $BACKUP_FILE" >&2
    exit 1
fi

echo "ACHTUNG:"
echo "Die Datenbank '${MONGODB_DATABASE}' wird vor dem Restore geleert."
echo
read -r -p "Restore wirklich durchführen? [j/N] " CONFIRMATION

case "$CONFIRMATION" in
    j|J|ja|JA|Ja)
        ;;
    *)
        echo "Restore abgebrochen."
        exit 0
        ;;
esac

echo "Stelle Backup wieder her ..."

mongorestore \
    --uri="$MONGODB_URI" \
    --archive="$BACKUP_FILE" \
    --gzip \
    --drop \
    --nsInclude="${MONGODB_DATABASE}.*"

echo "Restore erfolgreich abgeschlossen."