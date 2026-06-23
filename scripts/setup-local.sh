#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "[setup] npm is required but was not found in PATH."
  echo "[setup] Install Node.js 20+ and try again."
  exit 1
fi

echo "[setup] Installing npm dependencies..."
npm install

echo "[setup] Ensuring Puppeteer Chrome is installed..."
npx puppeteer browsers install chrome

echo "[setup] Ensuring data directory exists..."
mkdir -p server-data

echo "[setup] Setup complete."
