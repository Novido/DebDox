#!/usr/bin/env bash
# DebDox installer shared library — pure logic, no UI.
#
# A front-end (whiptail or plain-text) collects answers into the variables
# below, then calls the dbx_* functions in order. This keeps the graphical
# and terminal installers behaviourally identical.
#
# Required variables set by the caller:
#   DISK         e.g. /dev/sda                 ROOT_PART/EFI_PART are derived
#   BOOT_MODE    "uefi" | "bios"
#   LOCALE       e.g. en_US.UTF-8
#   KEYMAP       e.g. se
#   TIMEZONE     e.g. Europe/Stockholm
#   HOSTNAME     FQDN or short name            HOST_SHORT is derived
#   NET_IFACE    e.g. eth0
#   HOST_IP PREFIX GATEWAY DNS
#   ADMIN_USER ADMIN_PASS
#   ZFS_SELECTED (array of bare device names)  ZFS_TOPO ("mirror"|"raidz1"|"stripe")

TARGET="/target"

# Partition helper — handles sda1 vs nvme0n1p1 / mmcblk0p1 naming
part() { [[ "$1" == *nvme* || "$1" == *mmcblk* ]] && echo "${1}p${2}" || echo "${1}${2}"; }

# ── Partition ─────────────────────────────────────────────────────────────
dbx_partition() {
    echo "==> [1/7] Partitioning ${DISK}..."
    wipefs -a "$DISK" 2>/dev/null || true
    partprobe "$DISK" 2>/dev/null || true

    if [[ "$BOOT_MODE" == "uefi" ]]; then
        parted -s "$DISK" \
            mklabel gpt \
            mkpart ESP fat32 1MiB 513MiB \
            set 1 esp on \
            mkpart primary ext4 513MiB 100%
        EFI_PART=$(part "$DISK" 1)
        ROOT_PART=$(part "$DISK" 2)
    else
        parted -s "$DISK" \
            mklabel gpt \
            mkpart primary 1MiB 2MiB \
            set 1 bios_grub on \
            mkpart primary ext4 2MiB 100%
        ROOT_PART=$(part "$DISK" 2)
    fi
    partprobe "$DISK"
    sleep 1
}

# ── Format ────────────────────────────────────────────────────────────────
dbx_format() {
    echo "==> [2/7] Formatting partitions..."
    [[ "$BOOT_MODE" == "uefi" ]] && mkfs.fat -F32 -n EFI "$EFI_PART" -q
    mkfs.ext4 -L debdox-root -q -F "$ROOT_PART"
}

# ── Mount ─────────────────────────────────────────────────────────────────
dbx_mount() {
    echo "==> [3/7] Mounting target..."
    mkdir -p "$TARGET"
    mount "$ROOT_PART" "$TARGET"
    if [[ "$BOOT_MODE" == "uefi" ]]; then
        mkdir -p "${TARGET}/boot/efi"
        mount "$EFI_PART" "${TARGET}/boot/efi"
    fi
}

# ── Copy live system to disk ──────────────────────────────────────────────
dbx_copy() {
    echo "==> [4/7] Copying system to disk (this takes a few minutes)..."
    rsync -aHAX \
        --exclude="/dev/*" \
        --exclude="/proc/*" \
        --exclude="/sys/*" \
        --exclude="/tmp/*" \
        --exclude="/run/*" \
        --exclude="/mnt/*" \
        --exclude="/media/*" \
        --exclude="/target/*" \
        --exclude="/lost+found" \
        / "${TARGET}/"
}

# ── fstab ─────────────────────────────────────────────────────────────────
dbx_fstab() {
    ROOT_UUID=$(blkid -s UUID -o value "$ROOT_PART")
    {
        echo "UUID=${ROOT_UUID}  /        ext4  errors=remount-ro  0  1"
        if [[ "$BOOT_MODE" == "uefi" ]]; then
            EFI_UUID=$(blkid -s UUID -o value "$EFI_PART")
            echo "UUID=${EFI_UUID}   /boot/efi  vfat  umask=0077         0  2"
        fi
        echo "tmpfs            /tmp     tmpfs  defaults,nosuid,nodev  0  0"
    } > "${TARGET}/etc/fstab"
}

# ── Chroot bind mounts (+ stub update-grub) ───────────────────────────────
dbx_chroot_mounts() {
    echo "==> [5/7] Configuring installed system..."
    mount --bind /dev  "${TARGET}/dev"
    mount -t proc  proc  "${TARGET}/proc"
    mount -t sysfs sysfs "${TARGET}/sys"
    mount --bind /run  "${TARGET}/run"
    if [[ "$BOOT_MODE" == "uefi" ]]; then
        mount --bind /sys/firmware/efi/efivars \
            "${TARGET}/sys/firmware/efi/efivars" 2>/dev/null || true
    fi
    # Stub update-grub so kernel/package hooks don't fail in the chroot;
    # we write grub.cfg manually later, which overwrites anything generated.
    if [[ -f "${TARGET}/usr/sbin/update-grub" ]]; then
        cp "${TARGET}/usr/sbin/update-grub" "${TARGET}/usr/sbin/update-grub.bak"
        printf '#!/bin/sh\nexit 0\n' > "${TARGET}/usr/sbin/update-grub"
    fi
}

# ── Locale ────────────────────────────────────────────────────────────────
dbx_apply_locale() {
    echo "    locale     : ${LOCALE}"
    if grep -qE "^#? *${LOCALE} UTF-8" "${TARGET}/etc/locale.gen" 2>/dev/null; then
        sed -i "s/^#\? *${LOCALE} UTF-8/${LOCALE} UTF-8/" "${TARGET}/etc/locale.gen"
    else
        echo "${LOCALE} UTF-8" >> "${TARGET}/etc/locale.gen"
    fi
    chroot "$TARGET" locale-gen >/dev/null 2>&1 || true
    echo "LANG=${LOCALE}" > "${TARGET}/etc/default/locale"
}

# ── Keyboard ──────────────────────────────────────────────────────────────
dbx_apply_keyboard() {
    echo "    keyboard   : ${KEYMAP}"
    cat > "${TARGET}/etc/default/keyboard" <<EOF
XKBMODEL="pc105"
XKBLAYOUT="${KEYMAP}"
XKBVARIANT=""
XKBOPTIONS=""
BACKSPACE="guess"
EOF
}

# ── Time zone ─────────────────────────────────────────────────────────────
dbx_apply_timezone() {
    echo "    timezone   : ${TIMEZONE}"
    ln -sf "/usr/share/zoneinfo/${TIMEZONE}" "${TARGET}/etc/localtime"
    echo "${TIMEZONE}" > "${TARGET}/etc/timezone"
}

# ── Hostname ──────────────────────────────────────────────────────────────
dbx_apply_hostname() {
    HOST_SHORT="${HOSTNAME%%.*}"
    echo "    hostname   : ${HOSTNAME}"
    echo "${HOST_SHORT}" > "${TARGET}/etc/hostname"
    cat > "${TARGET}/etc/hosts" <<EOF
127.0.0.1   localhost
127.0.1.1   ${HOSTNAME} ${HOST_SHORT}
::1         localhost ip6-localhost ip6-loopback
EOF
}

# ── Network + DNS ─────────────────────────────────────────────────────────
dbx_apply_network() {
    echo "    network    : ${NET_IFACE} ${HOST_IP}/${PREFIX} gw ${GATEWAY}"
    local tmpl="${TARGET}/etc/network/interfaces.debdox-template"
    if [[ -f "$tmpl" ]]; then
        sed \
            -e "s|__IFACE__|${NET_IFACE}|g" \
            -e "s|__HOST_IP__|${HOST_IP}|g" \
            -e "s|__PREFIX__|${PREFIX}|g" \
            -e "s|__GATEWAY__|${GATEWAY}|g" \
            -e "s|__DNS__|${DNS}|g" \
            "$tmpl" > "${TARGET}/etc/network/interfaces"
    else
        cat > "${TARGET}/etc/network/interfaces" <<EOF
auto lo
iface lo inet loopback

auto ${NET_IFACE}
iface ${NET_IFACE} inet manual

auto vmbr0
iface vmbr0 inet static
    address ${HOST_IP}/${PREFIX}
    gateway ${GATEWAY}
    dns-nameservers ${DNS}
    bridge-ports ${NET_IFACE}
    bridge-stp off
    bridge-fd 0
    bridge-maxwait 0
EOF
    fi
    # Direct resolv.conf so name resolution works without resolvconf
    : > "${TARGET}/etc/resolv.conf"
    local ns
    for ns in ${DNS}; do
        echo "nameserver ${ns}" >> "${TARGET}/etc/resolv.conf"
    done
}

# ── Admin account + DebDox config ─────────────────────────────────────────
dbx_apply_admin() {
    echo "    admin user : ${ADMIN_USER}"
    echo "root:${ADMIN_PASS}" | chroot "$TARGET" chpasswd

    mkdir -p "${TARGET}/etc/debdox"
    cat > "${TARGET}/etc/debdox/api.env" <<EOF
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
DEBDOX_ADMIN_USERNAME=${ADMIN_USER}
DEBDOX_ADMIN_PASSWORD=${ADMIN_PASS}
EOF
    chmod 600 "${TARGET}/etc/debdox/api.env"

    cat > "${TARGET}/etc/debdox/system.conf" <<EOF
LOCALE=${LOCALE}
KEYMAP=${KEYMAP}
TIMEZONE=${TIMEZONE}
HOSTNAME=${HOSTNAME}
NET_IFACE=${NET_IFACE}
HOST_IP=${HOST_IP}
PREFIX=${PREFIX}
GATEWAY=${GATEWAY}
DNS=${DNS}
EOF
    echo "${HOST_IP}" > "${TARGET}/etc/debdox/host_ip"

    # Everything is configured during install — no first-boot wizard needed
    touch "${TARGET}/etc/debdox/.configured"
}

# ── ZFS storage pool (optional) ───────────────────────────────────────────
dbx_apply_zfs() {
    [[ ${#ZFS_SELECTED[@]} -gt 0 ]] || return 0
    echo "    zfs pool   : ${ZFS_TOPO} (${ZFS_SELECTED[*]})"

    # Ensure the installed system shares the live hostid so the pool imports
    # cleanly from cache on first boot.
    [[ -f /etc/hostid ]] || zgenhostid 2>/dev/null || true
    [[ -f /etc/hostid ]] && cp /etc/hostid "${TARGET}/etc/hostid"

    local devs=() d
    for d in "${ZFS_SELECTED[@]}"; do devs+=("/dev/${d}"); done

    mkdir -p "${TARGET}/etc/zfs"
    if [[ "$ZFS_TOPO" == "stripe" ]]; then
        zpool create -f -o cachefile="${TARGET}/etc/zfs/zpool.cache" \
            debdox-data "${devs[@]}" 2>/dev/null || true
    else
        zpool create -f -o cachefile="${TARGET}/etc/zfs/zpool.cache" \
            debdox-data "$ZFS_TOPO" "${devs[@]}" 2>/dev/null || true
    fi
    zfs create -p debdox-data/vms        2>/dev/null || true
    zfs create -p debdox-data/containers 2>/dev/null || true
    zfs create -p debdox-data/backups    2>/dev/null || true

    chroot "$TARGET" systemctl enable \
        zfs-import-cache.service zfs-import.target zfs-mount.service zfs.target \
        2>/dev/null || true
}

# ── Purge live-boot, disable installer service ────────────────────────────
dbx_purge_live() {
    DEBIAN_FRONTEND=noninteractive chroot "$TARGET" apt-get purge -y --auto-remove \
        live-boot live-boot-initramfs-tools \
        live-config live-config-systemd \
        live-tools 2>/dev/null || true

    chroot "$TARGET" systemctl disable debdox-installer.service 2>/dev/null || true
    rm -f "${TARGET}/etc/systemd/system/installer.target.wants/debdox-installer.service"
}

# ── Install GRUB + write grub.cfg ─────────────────────────────────────────
dbx_install_grub() {
    cat > "${TARGET}/etc/default/grub" <<EOF
GRUB_DEFAULT=0
GRUB_TIMEOUT=3
GRUB_DISTRIBUTOR="DebDox"
GRUB_CMDLINE_LINUX_DEFAULT=""
GRUB_CMDLINE_LINUX="root=UUID=${ROOT_UUID} ro quiet"
GRUB_DISABLE_OS_PROBER=true
EOF

    chroot "$TARGET" update-initramfs -u -k all

    echo "==> [6/7] Installing GRUB bootloader..."
    if [[ "$BOOT_MODE" == "uefi" ]]; then
        chroot "$TARGET" grub-install \
            --target=x86_64-efi \
            --efi-directory=/boot/efi \
            --bootloader-id=DebDox \
            --no-nvram \
            --recheck
        mkdir -p "${TARGET}/boot/efi/EFI/BOOT"
        cp "${TARGET}/boot/efi/EFI/DebDox/grubx64.efi" \
           "${TARGET}/boot/efi/EFI/BOOT/BOOTX64.EFI" 2>/dev/null || true
    else
        grub-install \
            --target=i386-pc \
            --boot-directory="${TARGET}/boot" \
            --recheck \
            "$DISK"
    fi

    local kver
    kver=$(ls "${TARGET}/boot/vmlinuz-"* 2>/dev/null \
        | sort -V | tail -1 | sed 's|.*/vmlinuz-||')
    [[ -n "$kver" ]] || { echo "ERROR: no kernel found in ${TARGET}/boot/"; exit 1; }
    echo "    kernel: ${kver}"

    mkdir -p "${TARGET}/boot/grub"
    cat > "${TARGET}/boot/grub/grub.cfg" <<EOF
set default=0
set timeout=3

insmod part_gpt
insmod part_msdos
insmod ext2
insmod gzio
insmod search
insmod search_fs_uuid

menuentry "DebDox" {
    search --no-floppy --fs-uuid --set=root ${ROOT_UUID}
    linux  /boot/vmlinuz-${kver} root=UUID=${ROOT_UUID} ro quiet
    initrd /boot/initrd.img-${kver}
}
EOF
    echo "    grub.cfg written (root UUID=${ROOT_UUID})"
}

# ── Pre-login console banner (Proxmox-style) ──────────────────────────────
dbx_issue() {
    cat > "${TARGET}/etc/issue" <<EOF

  DebDox Hypervisor Platform — \\n \\l

  Web UI:  http://${HOST_IP}/
  API:     http://${HOST_IP}/api

EOF
}

# ── Login required on the installed system (no autologin) ──────────────────
dbx_disable_autologin() {
    rm -f "${TARGET}/etc/systemd/system/getty@tty1.service.d/autologin.conf"
    rmdir "${TARGET}/etc/systemd/system/getty@tty1.service.d" 2>/dev/null || true
}

# ── Restore update-grub + unmount everything ──────────────────────────────
dbx_chroot_umounts() {
    if [[ -f "${TARGET}/usr/sbin/update-grub.bak" ]]; then
        mv "${TARGET}/usr/sbin/update-grub.bak" "${TARGET}/usr/sbin/update-grub"
    fi
    umount "${TARGET}/run"                      2>/dev/null || true
    umount "${TARGET}/sys/firmware/efi/efivars" 2>/dev/null || true
    umount "${TARGET}/sys"                      2>/dev/null || true
    umount "${TARGET}/proc"                     2>/dev/null || true
    umount "${TARGET}/dev"                      2>/dev/null || true
}

dbx_finish() {
    echo "==> [7/7] Finalising..."
    [[ "$BOOT_MODE" == "uefi" ]] && umount "${TARGET}/boot/efi" 2>/dev/null || true
    umount "$TARGET" 2>/dev/null || true
}

# ── Run the full install given the collected variables ────────────────────
dbx_run_install() {
    if [[ "${DEBDOX_DEBUG:-0}" == "1" ]]; then
        echo "[debug] command tracing on; logging to /var/log/debdox-install.log"
        exec > >(tee -a /var/log/debdox-install.log) 2>&1
        set -x
    else
        clear
    fi

    dbx_partition
    dbx_format
    dbx_mount
    dbx_copy
    dbx_fstab
    dbx_chroot_mounts
    dbx_apply_locale
    dbx_apply_keyboard
    dbx_apply_timezone
    dbx_apply_hostname
    dbx_apply_network
    dbx_apply_admin
    dbx_apply_zfs
    dbx_purge_live
    dbx_install_grub
    dbx_issue
    dbx_disable_autologin
    dbx_chroot_umounts

    # Save the install log onto the target for post-mortem inspection
    [[ -f /var/log/debdox-install.log ]] \
        && cp /var/log/debdox-install.log "${TARGET}/var/log/" 2>/dev/null || true

    # In debug mode leave the target mounted so the post-install shell can
    # inspect it; the debug wrapper unmounts (or reboot does) afterwards.
    if [[ "${DEBDOX_DEBUG:-0}" != "1" ]]; then
        dbx_finish
    fi
}
