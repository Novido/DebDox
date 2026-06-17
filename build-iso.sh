#!/usr/bin/env bash
# DebDox — Full ISO build pipeline
# Usage: bash build-iso.sh
# Must run as root on a Debian 13 Trixie host.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── Colour helpers ────────────────────────────────────────────────────────
ok()   { printf '\033[1;32m✓\033[0m  %s\n' "$*"; }
info() { printf '\033[1;34m=>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Preflight checks ──────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Must run as root (needed for live-build)."

command -v node  >/dev/null || die "node not found — install Node.js first."
command -v npm   >/dev/null || die "npm not found — install Node.js first."
command -v python3 >/dev/null || die "python3 not found."
command -v rsync >/dev/null || die "rsync not found."

# ── Step 1: Build the UI ──────────────────────────────────────────────────
info "Building UI (npm install + npm run build)..."
cd "${ROOT}/ui"
npm install --silent
npm run build
ok "UI built → ui/out/"
cd "$ROOT"

# ── Step 2: Copy sources into ISO includes ────────────────────────────────
info "Copying sources into iso-builder/config/includes.chroot/..."
bash "${ROOT}/scripts/prepare-iso-includes.sh"
ok "Sources ready in includes.chroot"

# ── Step 3: Build the ISO ─────────────────────────────────────────────────
info "Building ISO (this takes 15–40 minutes)..."
cd "${ROOT}/iso-builder"
bash build.sh
ok "ISO build complete → dist/"
cd "$ROOT"

# ── Done ─────────────────────────────────────────────────────────────────
printf '\n'
ok "All done! ISO is in dist/"
ls -lh "${ROOT}/dist/"*.iso 2>/dev/null || true
