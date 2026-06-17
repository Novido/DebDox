#!/bin/bash
# Install DebDox services from /opt/debdox (already copied by includes.chroot)
set -euo pipefail

DEBDOX_DIR="/opt/debdox"

# Create debdox system user (no login shell, added to required groups)
useradd --system --no-create-home --shell /usr/sbin/nologin \
    --groups libvirt,docker,kvm debdox 2>/dev/null || true

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

# --- UI (pre-built static files served by nginx) ---
mkdir -p /var/www/debdox
cp -r "${DEBDOX_DIR}/ui/out/." /var/www/debdox/
chown -R www-data:www-data /var/www/debdox

# Nginx config for DebDox UI
cat > /etc/nginx/sites-available/debdox <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/debdox;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to debdox-api
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }

    # Proxy MCP requests
    location /mcp/ {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/debdox /etc/nginx/sites-enabled/debdox
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.conf

# Enable systemd services
systemctl enable debdox-api
systemctl enable debdox-agent
systemctl enable debdox-mcp
systemctl enable debdox-ui        # debdox-ui.service wraps nginx; do NOT also enable nginx.service
systemctl enable debdox-monitoring
systemctl enable debdox-installer.service

echo "==> DebDox services enabled"
