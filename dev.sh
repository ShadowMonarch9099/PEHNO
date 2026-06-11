#!/bin/bash

# Terminate background proxy on exit
cleanup() {
    echo ""
    echo "Stopping database proxy..."
    if [ ! -z "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null
    fi
    exit
}
trap cleanup SIGINT SIGTERM

echo "Starting Supabase database proxy in background..."
python3 db_proxy.py > db_proxy.log 2>&1 &
PROXY_PID=$!

# Wait a second to ensure proxy started
sleep 1

echo "Starting Docker Compose services (API, Redis, Frontend)..."
docker compose up

# Keep script running to handle cleanup
wait
