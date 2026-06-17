#!/usr/bin/env bash
# DebDox ISO Builder
# Run on a Debian 13 (Trixie) host. Requires root.

set -euo pipefail

DEBDOX_VERSION="${DEBDOX_VERSION:-1.0.0}"
OUTPUT_DIR="${OUTPUT_DIR:-../dist}"
ARCH="amd64"

if [[ $EUID -ne 0 ]]; then
    echo "Error: must run as root" >&2
    exit 1
fi

echo "==> Installing live-build..."
apt-get update -qq
apt-get install -y --no-install-recommends live-build xorriso isolinux

echo "==> Cleaning previous build..."
lb clean --purge 2>/dev/null || true

echo "==> Configuring live-build..."
lb config \
    --architecture "${ARCH}" \
    --distribution trixie \
    --archive-areas "main contrib non-free non-free-firmware" \
    --bootappend-live "boot=live components locales=en_US.UTF-8 keyboard-layouts=se" \
    --iso-application "DebDox" \
    --iso-preparer "DebDox Project" \
    --iso-volume "DEBDOX_${DEBDOX_VERSION}" \
    --memtest none \
    --apt-recommends false

echo "==> Building ISO (this takes a while)..."
lb build 2>&1 | tee build.log

mkdir -p "${OUTPUT_DIR}"
ISO_FILE="live-image-amd64.hybrid.iso"
if [[ -f "${ISO_FILE}" ]]; then
    DEST="${OUTPUT_DIR}/debdox-${DEBDOX_VERSION}-${ARCH}.iso"
    mv "${ISO_FILE}" "${DEST}"
    echo "==> ISO ready: ${DEST}"
    sha256sum "${DEST}" > "${DEST}.sha256"
else
    echo "Error: ISO not found — check build.log" >&2
    exit 1
fi
