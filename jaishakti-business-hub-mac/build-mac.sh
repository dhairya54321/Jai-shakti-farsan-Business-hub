#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../jaishakti-business-hub" && pwd)"

echo "=========================================================="
echo "  Building Production Frontend Bundle (macOS)"
echo "=========================================================="

cd "$APP_DIR"
npm run build

echo "[SUCCESS] Production bundle generated in jaishakti-business-hub/server/public"
