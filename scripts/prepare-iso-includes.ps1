# DebDox — Prepare ISO includes (Windows / PowerShell)
# Copies all application sources into iso-builder/config/includes.chroot
# Run from the repo root: .\scripts\prepare-iso-includes.ps1

$ErrorActionPreference = "Stop"

$root     = Split-Path -Parent $PSScriptRoot
$includes = "$root\iso-builder\config\includes.chroot\opt\debdox"
$sysUnits = "$root\iso-builder\config\includes.chroot\etc\systemd\system"

Write-Host "==> Preparing ISO includes..." -ForegroundColor Cyan
Write-Host "    Root : $root"
Write-Host "    Dest : $includes"

# Create base directories
foreach ($d in @("api","agent","mcp","monitoring","ui")) {
    New-Item -ItemType Directory -Force -Path "$includes\$d" | Out-Null
}
New-Item -ItemType Directory -Force -Path $sysUnits | Out-Null

# --- Check UI build ---
if (-not (Test-Path "$root\ui\out")) {
    Write-Host ""
    Write-Host "ERROR: ui/out not found. Build the UI first:" -ForegroundColor Red
    Write-Host "  cd ui"
    Write-Host "  npm install"
    Write-Host "  npm run build"
    Write-Host ""
    exit 1
}

# Helper: robocopy with error handling (robocopy exit 1 = files copied = OK)
function Sync-Dir($src, $dst, $excludeDirs = @()) {
    $xd = ($excludeDirs | ForEach-Object { "/XD", $_ }) -join " "
    $args = @($src, $dst, "/MIR", "/NFL", "/NDL", "/NJH", "/NJS") + ($excludeDirs | ForEach-Object { "/XD"; $_ })
    $result = & robocopy @args
    if ($LASTEXITCODE -ge 8) {
        Write-Host "ERROR: robocopy failed (exit $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "==> Copying API..." -ForegroundColor Green
Sync-Dir "$root\api" "$includes\api" @(".venv", "__pycache__", "*.pyc")

Write-Host "==> Copying Agent..." -ForegroundColor Green
Sync-Dir "$root\agent" "$includes\agent" @(".venv", "__pycache__", "*.pyc")

Write-Host "==> Copying MCP server..." -ForegroundColor Green
Sync-Dir "$root\mcp" "$includes\mcp" @(".venv", "__pycache__", "*.pyc")

Write-Host "==> Copying Monitoring stack..." -ForegroundColor Green
Sync-Dir "$root\monitoring" "$includes\monitoring"

Write-Host "==> Copying UI build (out/)..." -ForegroundColor Green
Sync-Dir "$root\ui\out" "$includes\ui\out"

Write-Host "==> Copying systemd unit files..." -ForegroundColor Green
Copy-Item "$root\systemd\*.service" $sysUnits -Force

Write-Host ""
Write-Host "Done! includes.chroot is ready." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: build the ISO on a Debian 13 Trixie system:"
Write-Host "  cd iso-builder"
Write-Host "  sudo ./build.sh"
Write-Host ""
Write-Host "Or via Docker (Linux host only):"
Write-Host "  docker run --rm --privileged -v `"`${PWD}:/debdox`" debian:trixie bash -c `"cd /debdox/iso-builder && bash build.sh`""
