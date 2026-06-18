#!/bin/bash
# Install DebDox services from /opt/debdox (already copied by includes.chroot)
set -euo pipefail

DEBDOX_DIR="/opt/debdox"

# Create debdox system user (no login shell, added to required groups)
useradd --system --no-create-home --shell /usr/sbin/nologin \
    --groups libvirt,docker,kvm debdox 2>/dev/null || true

# Writable data/database directory owned by the service user.
# The API stores its SQLite DB in /var/lib/debdox (see api/src/config.py).
mkdir -p /var/lib/debdox /opt/debdox/data
chown -R debdox:debdox /var/lib/debdox /opt/debdox/data

# --- Web layer: the stock nginx.service (reliably enabled by the package)
#     serves our static config from includes.chroot. We do NOT ship a
#     separate debdox-ui.service — having two units fight over port 80 is
#     what left the web server in an inconsistent state. ---
# Ensure nginx (www-data) can traverse to and read the UI served from /opt/debdox.
chmod a+rx "${DEBDOX_DIR}" "${DEBDOX_DIR}/ui" 2>/dev/null || true
chmod -R a+rX "${DEBDOX_DIR}/ui/out" 2>/dev/null || true
# Drop any stray secondary default site some nginx builds ship in conf.d.
rm -f /etc/nginx/sites-enabled/default.conf /etc/nginx/conf.d/default.conf

# --- Enable services by creating the wants symlinks DIRECTLY. ---
# `systemctl enable` is unreliable inside the live-build chroot (no running
# systemd / D-Bus), which previously left the services 'disabled' on the
# installed system. Creating the exact symlinks enable would create always
# works offline and survives the rsync to the target.
MU_WANTS=/etc/systemd/system/multi-user.target.wants
mkdir -p "$MU_WANTS"
for svc in debdox-api debdox-agent debdox-mcp debdox-monitoring; do
    ln -sf "/etc/systemd/system/${svc}.service" "${MU_WANTS}/${svc}.service"
done

# Make sure the stock nginx is enabled even if the package preset didn't fire.
for u in /lib/systemd/system/nginx.service /usr/lib/systemd/system/nginx.service; do
    [[ -f "$u" ]] && ln -sf "$u" "${MU_WANTS}/nginx.service" && break
done

# The installer service runs from the live ISO only (installer.target);
# debdox-install disables it on the installed system.
INST_WANTS=/etc/systemd/system/installer.target.wants
mkdir -p "$INST_WANTS"
ln -sf "/etc/systemd/system/debdox-installer.service" \
    "${INST_WANTS}/debdox-installer.service"

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

echo "==> DebDox services enabled (wants symlinks created)"
