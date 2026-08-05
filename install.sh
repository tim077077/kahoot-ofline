#!/data/data/com.termux/files/usr/bin/bash
#
# Instalare COMPLETĂ, într-o singură comandă, pentru Termux (Android).
#
# Ce face:
#   1) Instalează Node.js + git (dacă lipsesc)
#   2) Clonează proiectul (sau îl actualizează, dacă există deja)
#   3) Instalează dependențele Node
#   4) Pornește serverul
#
# Sigur de rulat de mai multe ori — sare peste ce e deja făcut, deci
# poți folosi acest script și pentru actualizări ulterioare.
#
# Prima rulare are nevoie de internet. După aceea, jocul pornește
# 100% offline (folosind doar `bash start.sh`, fără acest script).
#
set -e

REPO_URL="https://github.com/tim077077/kahoot-ofline.git"

echo "==> [1/4] Verific pachetele Termux (nodejs, git)..."
pkg install -y nodejs git

# Detectăm dacă rulăm deja din interiorul unei copii a proiectului,
# sau dacă există una în ~/kahoot-ofline, ca să nu mai dăm eroare de
# tip "destination path already exists" la clonare repetată.
if [ -f "package.json" ] && grep -q '"name": "kahoot-offline"' package.json 2>/dev/null; then
  PROJECT_DIR="$(pwd)"
  echo "==> [2/4] Proiect găsit aici: $PROJECT_DIR"
elif [ -d "$HOME/kahoot-ofline/.git" ]; then
  PROJECT_DIR="$HOME/kahoot-ofline"
  echo "==> [2/4] Proiect găsit în $PROJECT_DIR"
else
  PROJECT_DIR="$HOME/kahoot-ofline"
  echo "==> [2/4] Clonez proiectul în $PROJECT_DIR ..."
  git clone "$REPO_URL" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

if [ -d .git ]; then
  echo "==> Actualizez codul la ultima versiune (dacă am internet)..."
  git pull --ff-only 2>/dev/null || echo "    (fără internet sau fără schimbări noi — continui cu ce am local)"
fi

echo "==> [3/4] Instalez dependențele Node.js..."
npm install

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
fi

echo ""
echo "  ✅ Instalare completă!"
echo "  Proiectul e salvat în: $PROJECT_DIR"
echo ""
echo "  Data viitoare NU mai ai nevoie de acest script — pornești"
echo "  jocul direct, complet offline, cu:"
echo ""
echo "      cd $PROJECT_DIR && bash start.sh"
echo ""
echo "==> [4/4] Pornesc serverul acum..."
echo ""
exec bash start.sh
