#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../jaishakti-business-hub" && pwd)"

echo "=========================================================="
echo "  Starting Jai Shakti Business Hub (macOS)"
echo "=========================================================="

cd "$APP_DIR"

# Ensure client is built into server/public
if [ ! -d "server/public" ]; then
    echo "Building React frontend assets..."
    npm run build
fi

# Detect port conflict
PORT="${PORT:-3000}"
if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[WARNING] Port $PORT is already in use by process $(lsof -Pi :"$PORT" -sTCP:LISTEN -t)!"
    echo "You can stop existing instances with ./stop-mac.sh or change PORT in .env"
    exit 1
fi

echo "Starting server on http://localhost:$PORT..."
echo "Press Ctrl+C to stop."
echo ""

# Launch server
node server/index.js
