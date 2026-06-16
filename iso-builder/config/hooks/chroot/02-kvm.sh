#!/bin/bash
# Configure KVM/libvirt
set -euo pipefail

# Enable libvirtd at boot
systemctl enable libvirtd

# Allow debdox user (created later) to use libvirt without sudo
cat > /etc/polkit-1/rules.d/50-libvirt.rules <<'EOF'
polkit.addRule(function(action, subject) {
    if (action.id == "org.libvirt.unix.manage" &&
        subject.isInGroup("libvirt")) {
        return polkit.Result.YES;
    }
});
EOF

# Default libvirt network disabled — we use vmbr0 instead
systemctl disable libvirt-guests 2>/dev/null || true
