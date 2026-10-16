#!/usr/bin/env bash
# Builds the client as static files into out/ for the Capacitor app.
# Route handlers can't be statically exported, so src/app/api steps
# aside for the build and always comes back.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${NEXT_PUBLIC_API_BASE:-}" ]; then
  echo "Set NEXT_PUBLIC_API_BASE to the deployed site, e.g. https://paw-pictures.you.workers.dev" >&2
  exit 1
fi

stash=".app-build-stash"
rm -rf "$stash" && mkdir -p "$stash"
restore() {
  [ -d "$stash/api" ] && mv "$stash/api" src/app/api
  rm -rf "$stash"
}
trap restore EXIT
mv src/app/api "$stash/api"

rm -rf out
# Web Billing inside a store app breaks store rules; the app gets native
# purchases (README "Going to the stores"), so its build never has the web key.
APP_EXPORT=1 NEXT_PUBLIC_REVENUECAT_WEB_KEY= NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$NEXT_PUBLIC_API_BASE}" npx next build
