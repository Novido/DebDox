#!/bin/bash
# GPU support: NVIDIA Container Toolkit + VFIO for passthrough
set -euo pipefail

# --- NVIDIA Container Toolkit ---
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update -qq
# Install toolkit; driver itself is not bundled (installed post-boot by user or via debdox UI)
apt-get install -y nvidia-container-toolkit

# Configure CDI for rootless Docker use
nvidia-ctk runtime configure --runtime=docker 2>/dev/null || true

# --- VFIO for GPU passthrough to VMs ---
cat >> /etc/modprobe.d/debdox-vfio.conf <<'EOF'
# Bind GPU to VFIO before host driver loads (PCI IDs set via debdox UI)
# options vfio-pci ids=10de:xxxx,10de:yyyy
softdep nouveau pre: vfio vfio_pci
softdep nvidia pre: vfio vfio_pci
EOF

cat >> /etc/modules-load.d/debdox.conf <<'EOF'
vfio
vfio_iommu_type1
vfio_pci
EOF
