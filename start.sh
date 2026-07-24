#!/data/data/com.termux/files/usr/bin/bash
#
# Helper de pornire pentru Termux (Android).
# Instalează dependențele la prima rulare și pornește serverul.
#
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "==> Prima rulare: instalez dependențele (necesită internet o singură dată)..."
  npm install
fi

# Ține telefonul treaz cât timp rulează serverul (dacă termux-api e instalat).
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
fi

echo "==> Pornesc serverul Quiz Offline..."
echo "    (Oprește cu Ctrl+C)"
PORT="${PORT:-5000}" node server.js
