#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_SRC="$ROOT_DIR/jaishakti-business-hub"
WIN_DIR="$ROOT_DIR/jaishakti-business-hub-windows"
WIN_APP_DIR="$WIN_DIR/app"

echo "=========================================================="
echo "  Packaging Windows Shop Deployment Package"
echo "=========================================================="

# 1. Build frontend
echo "[1/4] Compiling frontend bundle..."
cd "$APP_SRC"
npm run build

# 2. Ensure target directories exist
echo "[2/4] Initializing Windows deployment structure..."
mkdir -p "$WIN_APP_DIR" "$WIN_DIR/data" "$WIN_DIR/uploads" "$WIN_DIR/backups" "$WIN_DIR/logs"

# 3. Copy server files, public build, and config to Windows app folder
echo "[3/4] Copying server and production assets to $WIN_APP_DIR..."
rm -rf "$WIN_APP_DIR/server"
mkdir -p "$WIN_APP_DIR/server"
cp -R "$APP_SRC/server/" "$WIN_APP_DIR/server/"
cp "$APP_SRC/package.json" "$WIN_APP_DIR/"

# 4. Copy production node_modules or package manifest
echo "[4/4] Copying package configuration..."
cp "$WIN_DIR/.env.example" "$WIN_APP_DIR/.env.example" 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  [SUCCESS] Windows package generated at:"
echo "  $WIN_DIR"
echo "  Now copy the entire 'jaishakti-business-hub-windows' folder"
echo "  to your shop PC via USB drive or network share."
echo "=========================================================="
