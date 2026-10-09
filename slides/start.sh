#!/usr/bin/env sh
# Installs, builds and starts SlideDrop on http://localhost:3000.
set -e
cd "$(dirname "$0")"
[ -f .env.local ] || cp .env.example .env.local
npm install
npm run build
npm start
