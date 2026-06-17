#!/bin/bash
# Configure kernel modules for DebDox
set -euo pipefail

cat > /etc/modules-load.d/debdox.conf <<'EOF'
# KVM
kvm
kvm_intel
kvm_amd
# ZFS
zfs
# VirtIO
virtio
virtio_net
virtio_blk
virtio_scsi
# VFIO (GPU passthrough)
vfio
vfio_iommu_type1
vfio_pci
EOF

# Enable IOMMU for GPU passthrough support (handled in grub config)
cat > /etc/default/grub.d/debdox-iommu.cfg <<'EOF'
GRUB_CMDLINE_LINUX="${GRUB_CMDLINE_LINUX} intel_iommu=on amd_iommu=on iommu=pt"
EOF
