#!/usr/bin/env bash
# Copies the production MongoDB into a local database for the new super admin.
#
#  1. READS production with mongodump (no writes to production, ever)
#  2. Restores into mongodb://127.0.0.1:27017/kwickbot_superadmin_local
#     (replacing the previous local copy)
#  3. Removes tokens, credentials and secrets from the local copy (sanitize.js)
#  4. Deletes the temporary dump files
#
# Source: MONGODB_URI from backend/.env, or SOURCE_MONGODB_URI if set.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
LOCAL_URI="mongodb://127.0.0.1:27017/kwickbot_superadmin_local"
LOCAL_DB="kwickbot_superadmin_local"

SOURCE_URI="${SOURCE_MONGODB_URI:-$(grep -E '^MONGODB_URI=' "$ROOT/backend/.env" | cut -d= -f2-)}"
if [ -z "$SOURCE_URI" ]; then
  echo "No source database. Set MONGODB_URI in backend/.env or SOURCE_MONGODB_URI." >&2
  exit 1
fi
SOURCE_DB="$(echo "$SOURCE_URI" | sed -E 's#^mongodb(\+srv)?://[^/]+/([^?]+).*#\2#')"
if [ -z "$SOURCE_DB" ] || [ "$SOURCE_DB" = "$SOURCE_URI" ]; then
  echo "Could not read the database name from the source URI." >&2
  exit 1
fi
if [ "$SOURCE_DB" = "$LOCAL_DB" ] || echo "$SOURCE_URI" | grep -qE '127\.0\.0\.1|localhost'; then
  echo "Source looks local. This script only copies from the remote production database." >&2
  exit 1
fi

if ! mongosh "$LOCAL_URI" --quiet --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1; then
  echo "Local MongoDB is not running. Start it with: brew services start mongodb-community@7.0" >&2
  exit 1
fi

DUMP="$(mktemp -d)"
trap 'rm -rf "$DUMP"' EXIT

echo "1/3 Reading production database \"$SOURCE_DB\" (read-only)"
mongodump --uri "$SOURCE_URI" --out "$DUMP" --quiet

echo "2/3 Restoring into local \"$LOCAL_DB\""
mongorestore --uri "mongodb://127.0.0.1:27017" --drop --quiet \
  --nsFrom "$SOURCE_DB.*" --nsTo "$LOCAL_DB.*" "$DUMP"

echo "3/3 Removing tokens and secrets from the local copy"
mongosh "$LOCAL_URI" --quiet "$HERE/sanitize.js"

echo "Done. Local copy: $LOCAL_URI"
