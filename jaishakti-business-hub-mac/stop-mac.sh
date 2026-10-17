#!/bin/bash

echo "=========================================================="
echo "  Stopping Jai Shakti Business Hub (macOS)"
echo "=========================================================="

PORT="${PORT:-3000}"
PID=$(lsof -Pi :"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)

if [ -n "$PID" ]; then
    echo "Stopping Jai Shakti process on port $PORT (PID: $PID)..."
    kill -15 "$PID" 2>/dev/null || true
    sleep 1
    # Check if still running
    if kill -0 "$PID" 2>/dev/null; then
        echo "Forcing termination of process $PID..."
        kill -9 "$PID" 2>/dev/null || true
    fi
    echo "[SUCCESS] Jai Shakti server stopped cleanly."
else
    echo "[INFO] No running server found on port $PORT."
fi
