#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[bootstrap] Setting up local environment..."
bash "./scripts/setup-local.sh"
echo "[bootstrap] Environment setup complete."
echo "[bootstrap] Run 'npm run dev' to start the dashboard."
