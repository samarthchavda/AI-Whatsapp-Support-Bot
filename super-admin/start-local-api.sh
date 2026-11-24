#!/usr/bin/env bash
# Runs the new super admin API (super-admin/api) against the LOCAL copy of the
# database. Same guard as the local backend: only 127.0.0.1 MongoDB, no
# outbound network. Shares the local JWT secret with start-local-backend.sh so
# the same login works on both.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
API="$HERE/api"
SECRETS="$HERE/local-backend/.local-secrets"

if [ ! -f "$SECRETS" ] || ! grep -q '^INTERNAL_API_KEY=' "$SECRETS"; then
  echo "Start the local backend once first (super-admin/start-local-backend.sh); it creates the local secrets." >&2
  exit 1
fi
if [ ! -d "$API/node_modules" ]; then
  (cd "$API" && npm install --no-audit --no-fund)
fi

export MONGODB_URI="mongodb://127.0.0.1:27017/kwickbot_superadmin_local"
export PORT="${LOCAL_API_PORT:-5003}"
export JWT_ACCESS_SECRET="$(grep '^JWT_ACCESS_SECRET=' "$SECRETS" | cut -d= -f2-)"
export INTERNAL_API_KEY="$(grep '^INTERNAL_API_KEY=' "$SECRETS" | cut -d= -f2-)"
export GUARD_MODULE_DIR="$API"

cd "$API"
exec node -r "$HERE/local-backend/guard.js" server.js
