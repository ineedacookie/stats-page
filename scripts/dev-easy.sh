#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${SKIP_PULL:-0}" != "1" ]] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    echo "[dev-easy] Pulling latest changes..."
    if ! git pull --ff-only; then
      echo "[dev-easy] git pull failed; continuing with local checkout."
    fi
  else
    echo "[dev-easy] No upstream branch configured; skipping git pull."
  fi
else
  echo "[dev-easy] Skipping git pull."
fi

bash "./scripts/setup-local.sh"

echo "[dev-easy] Starting frontend + backend..."
npm run dev
