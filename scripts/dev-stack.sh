#!/usr/bin/env bash
# One command to a working local stack — Docker, Supabase (with every
# migration applied), and the app built against it on :3000 — and back again
# after a container restart. Safe to re-run: each step is skipped when it's
# already up.
#
#   npm run stack:up            start what's missing
#   npm run stack:up -- build   also rebuild the app (after code changes)
#
# Then: E2E_LOCAL_STACK=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/<spec>
set -euo pipefail
cd "$(dirname "$0")/.."
LOGS="${TMPDIR:-/tmp}/mc-stack"
mkdir -p "$LOGS"
up() { curl -s -o /dev/null -w '%{http_code}' localhost:3000 2>/dev/null || true; }

# Docker (cloud containers lose the daemon on restart).
if ! docker ps >/dev/null 2>&1; then
  echo "· starting Docker"
  (nohup dockerd >"$LOGS/dockerd.log" 2>&1 &)
  for _ in $(seq 1 40); do docker ps >/dev/null 2>&1 && break; sleep 1; done
fi

# Supabase, then any migrations not yet applied.
if ! npx supabase status -o json >"$LOGS/status.json" 2>/dev/null; then
  echo "· starting Supabase (first run pulls images — a few minutes)"
  npm run db:start >"$LOGS/db-start.log" 2>&1
  npx supabase status -o json >"$LOGS/status.json"
fi
npx supabase migration up --local >/dev/null 2>&1 || true

API_URL=$(node -e "console.log(require('$LOGS/status.json').API_URL)")
ANON=$(node -e "console.log(require('$LOGS/status.json').ANON_KEY)")

# The app, built against the local stack.
if [ "${1:-}" = "build" ] || [ ! -f .next/BUILD_ID ]; then
  echo "· building the app against $API_URL"
  NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON npm run build >"$LOGS/build.log" 2>&1 || { tail -30 "$LOGS/build.log"; exit 1; }
  for p in $(pgrep -f "[n]ext-server" || true); do kill "$p"; done
fi
if [ "$(up)" != 200 ]; then
  echo "· serving on http://localhost:3000"
  (nohup npx next start -p 3000 >"$LOGS/serve.log" 2>&1 &)
  for _ in $(seq 1 40); do [ "$(up)" = 200 ] && break; sleep 1; done
fi
echo "stack: db=$API_URL app=$(up) (logs in $LOGS)"
