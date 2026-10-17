#!/bin/bash
set -e

echo "=========================================================="
echo "  Jai Shakti Business Hub — macOS Setup (Mac mini)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../jaishakti-business-hub" && pwd)"

# 1. Verify Node.js and npm
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js v18 or v20+ via https://nodejs.org or 'brew install node'."
    exit 1
fi

echo "[1/4] Detected Node.js $(node -v) and npm $(npm -v)"

# 2. Setup .env if not exists
cd "$APP_DIR"
if [ ! -f ".env" ]; then
    echo "[2/4] Initializing .env configuration from .env.example..."
    cp "$SCRIPT_DIR/.env.example" .env
else
    echo "[2/4] Existing .env file found. Preserving current configuration."
fi

# 3. Install dependencies
echo "[3/4] Installing project dependencies..."
npm install

# 4. Run database migrations & seed initial categories
echo "[4/4] Applying database migrations and initial seed data..."
npm run migrate
npm run seed

echo ""
echo "=========================================================="
echo "  [SUCCESS] Mac setup completed successfully!"
echo "  To start the application: ./start-mac.sh"
echo "  To run automated tests:   ./test-mac.sh"
echo "  To build Windows package: ./package-windows.sh"
echo "=========================================================="
