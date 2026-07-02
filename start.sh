#!/usr/bin/env bash
set -e

# Kill any existing servers
lsof -ti :5001 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

echo "🔧 Installing dependencies..."
cd "$(dirname "$0")"
pip3 install -q flask flask-cors
npm install --silent

echo -e "\n📦 Parsing weather data..."
python3 backend/ingest.py

echo -e "\n🚀 Starting Flask API on :5001..."
python3 -c "
from backend.app import app
app.run(host='0.0.0.0', port=5001, debug=False)
" &
sleep 2
echo "✓ API ready at http://localhost:5001"

echo -e "\n🚀 Starting Vite frontend on :5173..."
echo "→ Open http://localhost:5173/Meteo-2026/"
npx vite --host
