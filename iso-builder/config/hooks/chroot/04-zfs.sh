#!/bin/bash
# Install OpenZFS (latest from contrib)
set -euo pipefail

apt-get install -y zfsutils-linux zfs-dkms

# Enable ZFS services
systemctl enable zfs-import-cache
systemctl enable zfs-import-scan
systemctl enable zfs-mount
systemctl enable zfs-share
systemctl enable zfs.target

# ZFS tuning for hypervisor workloads
cat > /etc/modprobe.d/zfs.conf <<'EOF'
# ARC limited to 50% of RAM (adjusted at runtime by debdox-api based on total RAM)
options zfs zfs_arc_max=4294967296
# Disable prefetch for random I/O workloads (VMs)
options zfs zfs_prefetch_disable=0
EOF
