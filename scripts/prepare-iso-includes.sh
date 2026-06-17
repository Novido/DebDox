#!/usr/bin/env bash
# DebDox — Prepare ISO includes (Linux / WSL2 / Docker)
# Copies all application sources into iso-builder/config/includes.chroot
# Run from the repo root: bash scripts/prepare-iso-includes.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INCLUDES="${ROOT}/iso-builder/config/includes.chroot/opt/debdox"
SYS_UNITS="${ROOT}/iso-builder/config/includes.chroot/etc/systemd/system"

echo "==> Root     : ${ROOT}"
echo "==> Includes : ${INCLUDES}"

# Check UI build
if [[ ! -d "${ROOT}/ui/out" ]]; then
    echo ""
    echo "ERROR: ui/out not found. Build the UI first:"
    echo "  cd ui && npm install && npm run build"
    echo ""
    exit 1
fi

# Create directories
mkdir -p "${INCLUDES}"/{api,agent,mcp,monitoring,ui/out}
mkdir -p "${SYS_UNITS}"
mkdir -p "${ROOT}/iso-builder/config/includes.chroot/usr/local/bin"
mkdir -p "${ROOT}/iso-builder/config/includes.chroot/etc/profile.d"
mkdir -p "${ROOT}/iso-builder/config/includes.chroot/etc/systemd/system/getty@tty1.service.d"

echo "==> Copying API..."
rsync -a --delete \
    --exclude='.venv/' --exclude='__pycache__/' --exclude='*.pyc' \
    "${ROOT}/api/" "${INCLUDES}/api/"

echo "==> Copying Agent..."
rsync -a --delete \
    --exclude='.venv/' --exclude='__pycache__/' --exclude='*.pyc' \
    "${ROOT}/agent/" "${INCLUDES}/agent/"

echo "==> Copying MCP server..."
rsync -a --delete \
    --exclude='.venv/' --exclude='__pycache__/' --exclude='*.pyc' \
    "${ROOT}/mcp/" "${INCLUDES}/mcp/"

echo "==> Copying Monitoring stack..."
rsync -a --delete "${ROOT}/monitoring/" "${INCLUDES}/monitoring/"

echo "==> Copying UI build (out/)..."
rsync -a --delete "${ROOT}/ui/out/" "${INCLUDES}/ui/out/"

echo "==> Copying systemd unit files..."
cp "${ROOT}/systemd/"*.service "${SYS_UNITS}/"

echo ""
echo "Done! includes.chroot is ready."
echo ""
echo "Next steps:"
echo "  cd iso-builder"
echo "  sudo ./build.sh"
