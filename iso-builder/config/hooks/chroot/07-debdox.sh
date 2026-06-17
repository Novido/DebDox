#!/bin/bash
# Install DebDox services from /opt/debdox (already copied by includes.chroot)
set -euo pipefail

DEBDOX_DIR="/opt/debdox"

# Create debdox system user (no login shell, added to required groups)
useradd --system --no-create-home --shell /usr/sbin/nologin \
    --groups libvirt,docker,kvm debdox 2>/dev/null || true

# --- Web layer (nginx config is static via includes.chroot) ---
# Ensure nginx (www-data) can traverse to and read the UI served from /opt/debdox.
chmod a+rx "${DEBDOX_DIR}" "${DEBDOX_DIR}/ui" 2>/dev/null || true
chmod -R a+rX "${DEBDOX_DIR}/ui/out" 2>/dev/null || true
# Drop any stray secondary default site some nginx builds ship in conf.d.
rm -f /etc/nginx/sites-enabled/default.conf /etc/nginx/conf.d/default.conf

# --- Enable services FIRST so they are always enabled even if a later
#     pip step fails the build (loud failure, but web layer stays intact) ---
systemctl enable debdox-api
systemctl enable debdox-agent
systemctl enable debdox-mcp
systemctl enable debdox-ui        # debdox-ui.service wraps nginx; do NOT also enable nginx.service
systemctl enable debdox-monitoring
systemctl enable debdox-installer.service

# --- Python virtualenvs ---
# --- API ---
cd "${DEBDOX_DIR}/api"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -r requirements.txt --quiet

# --- Agent ---
cd "${DEBDOX_DIR}/agent"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -r requirements.txt --quiet

# --- MCP ---
cd "${DEBDOX_DIR}/mcp"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -r requirements.txt --quiet

echo "==> DebDox services enabled"
