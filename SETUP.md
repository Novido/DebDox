# DebDox — ISO Build Guide

This guide explains how to build a bootable **DebDox ISO** from source.  
The resulting `.iso` file can be flashed to a USB drive or used with a VM to install DebDox on any x86-64 bare-metal server.

---

## Prerequisites

### Build host requirements

The ISO **must** be built on a **Debian 13 "Trixie"** system (physical machine, VM, or container). Building on Ubuntu or other distros is not supported by live-build.

| Requirement | Details |
|---|---|
| OS | Debian 13 Trixie (amd64) |
| RAM | ≥ 4 GB |
| Disk (free) | ≥ 20 GB (chroot + ISO) |
| Privileges | Must run as **root** |
| Network | Required during build (packages downloaded) |

### Install build dependencies

```bash
apt-get update
apt-get install -y live-build xorriso isolinux debootstrap
```

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/Novido/DebDox.git
cd DebDox/iso-builder
```

---

## Step 2 — (Optional) Customize the build

Before building, you can adjust the following files:

### Add or remove packages

Edit [iso-builder/config/package-lists/debdox.list.chroot](iso-builder/config/package-lists/debdox.list.chroot).  
One package per line. Packages are installed into the ISO's root filesystem.

### Modify install hooks

The hooks in [iso-builder/config/hooks/chroot/](iso-builder/config/hooks/chroot/) run inside the chroot during build, in numbered order:

| Hook | What it does |
|---|---|
| `01-kernel.sh` | Loads KVM, ZFS, VFIO kernel modules |
| `02-kvm.sh` | Configures libvirt, sets polkit rules |
| `03-docker.sh` | Adds Docker CE repo, installs Docker Engine |
| `04-zfs.sh` | Installs OpenZFS, enables ZFS services |
| `05-gpu.sh` | Installs NVIDIA Container Toolkit, sets up VFIO |
| `06-network.sh` | Configures vmbr0 bridge template, sysctl |
| `07-debdox.sh` | Installs Python venvs, nginx config, enables systemd services |

To skip a hook (e.g., GPU support on a non-GPU server), add an early `exit 0` at the top of the hook file.

### Adjust preseed (automated disk partitioning)

Edit [iso-builder/config/preseed/debdox.cfg](iso-builder/config/preseed/debdox.cfg) to change locale, timezone, or partitioning defaults.

### Change the live-build config

Edit [iso-builder/auto/config](iso-builder/auto/config) to change the target Debian suite, archive areas, or architecture.

---

## Step 3 — Build the UI (required before building ISO)

The ISO includes a pre-built Next.js static export. Build it first:

```bash
# From the repo root
cd ui
npm install
npm run build
# Output goes to ui/out/
```

Then copy the build into the ISO's includes:

```bash
cp -r ui/out iso-builder/config/includes.chroot/opt/debdox/ui/out
```

---

## Step 4 — Copy application code into the ISO

The API, agent, and MCP source code must be present in `includes.chroot` so hook `07-debdox.sh` can install them:

```bash
# From the repo root
cp -r api  iso-builder/config/includes.chroot/opt/debdox/api
cp -r agent iso-builder/config/includes.chroot/opt/debdox/agent
cp -r mcp  iso-builder/config/includes.chroot/opt/debdox/mcp
cp -r monitoring iso-builder/config/includes.chroot/opt/debdox/monitoring
cp -r systemd/* iso-builder/config/includes.chroot/etc/systemd/system/
```

Or run the helper script (once created):

```bash
./scripts/prepare-iso-includes.sh
```

---

## Step 5 — Build the ISO

```bash
cd iso-builder
sudo ./build.sh
```

The build process takes **15–40 minutes** depending on your internet speed and hardware. It will:

1. Install `live-build` if not present
2. Run `lb config` with the settings from `auto/config`
3. Bootstrap a Debian 13 Trixie chroot
4. Install all packages from `package-lists/`
5. Run all hooks in `hooks/chroot/` in order
6. Copy `includes.chroot/` into the rootfs
7. Generate a hybrid ISO bootable via BIOS and UEFI

Output: `dist/debdox-1.0.0-amd64.iso`  
SHA-256: `dist/debdox-1.0.0-amd64.iso.sha256`

### Build log

All output is written to `iso-builder/build.log`. If the build fails, check there first:

```bash
tail -100 iso-builder/build.log
```

---

## Step 6 — Flash to USB (for bare-metal install)

```bash
# Replace /dev/sdX with your USB drive — THIS WILL ERASE IT
sudo dd if=dist/debdox-1.0.0-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

Or use [Balena Etcher](https://etcher.balena.io/) on Windows/macOS.

---

## Step 7 — Install DebDox on bare-metal

1. Boot the server from the USB drive (set boot order in BIOS/UEFI)
2. The TUI installer starts automatically
3. Follow the prompts to:
   - Select primary network interface
   - Assign a static IP for `vmbr0`
   - Choose ZFS pool topology (mirror, RAIDZ1, or single disk)
   - Set the admin password
4. The installer writes `/etc/network/interfaces` and creates the ZFS pool
5. On reboot, all DebDox services start automatically

Access the web UI at `http://[HOST_IP]` — default login: `admin` / `DebDox!Change`

---

## Building in a VM (for testing)

You can build and test the ISO inside a QEMU VM:

```bash
# Create a test VM disk
qemu-img create -f qcow2 /tmp/debdox-test.qcow2 40G

# Boot the ISO in QEMU (with KVM acceleration)
qemu-system-x86_64 \
  -enable-kvm \
  -m 4096 \
  -smp 4 \
  -cdrom dist/debdox-1.0.0-amd64.iso \
  -drive file=/tmp/debdox-test.qcow2,if=virtio \
  -net nic,model=virtio \
  -net user,hostfwd=tcp::8080-:8080,hostfwd=tcp::8022-:22 \
  -boot d
```

After install, reboot without the ISO and access the UI at `http://localhost:8080`.

---

## Environment variables

After installation, services read their configuration from `/etc/debdox/`:

| File | Service | Key variables |
|---|---|---|
| `/etc/debdox/api.env` | debdox-api | `SECRET_KEY`, `DEBDOX_ADMIN_PASSWORD`, `DB_URL` |
| `/etc/debdox/agent.env` | debdox-agent | `DEBDOX_MASTER_URL`, `DEBDOX_NODE_ID`, `DEBDOX_CLUSTER_SECRET` |
| `/etc/debdox/mcp.env` | debdox-mcp | `DEBDOX_API_URL`, `DEBDOX_API_KEY` |

Edit these files and restart the relevant service:

```bash
systemctl restart debdox-api
```

---

## Service management

```bash
# Check status of all DebDox services
systemctl status debdox-api debdox-ui debdox-agent debdox-mcp debdox-monitoring

# View logs
journalctl -u debdox-api -f
journalctl -u debdox-agent -f

# Restart monitoring stack (also pulls latest Docker images)
systemctl restart debdox-monitoring
```

---

## Rebuilding after code changes

If you change the API or UI source code after the initial ISO build, you do **not** need to rebuild the ISO for a running system. Instead, update the files in `/opt/debdox/` directly and restart the service:

```bash
# On the running DebDox host:
rsync -av api/ /opt/debdox/api/
systemctl restart debdox-api
```

Rebuild the ISO only when you want to produce a fresh installable image with the changes baked in.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `lb build` fails with "debootstrap error" | Check internet connection; ensure you're on Debian Trixie |
| Hook fails | Check `iso-builder/build.log`; re-run with `sudo lb build 2>&1 | tee build.log` |
| UI not loading after install | `systemctl status debdox-ui nginx` — check nginx config |
| `debdox-api` fails to start | `journalctl -u debdox-api` — check Python venv and libvirt socket |
| ZFS pool not found | Ensure ZFS kernel module loaded: `modprobe zfs && zpool import` |
| Docker not working | `systemctl restart docker` then `systemctl restart debdox-api` |
| GPU not detected | Install NVIDIA drivers post-install: `apt-get install nvidia-driver` |
