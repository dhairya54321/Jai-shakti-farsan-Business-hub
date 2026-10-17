#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../jaishakti-business-hub" && pwd)"

echo "=========================================================="
echo "  Running Jai Shakti Automated Test Suite (macOS)"
echo "=========================================================="

cd "$APP_DIR"
npm test
