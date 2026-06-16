"""Libvirt service — wraps libvirt-python in async-friendly calls via asyncio.to_thread."""
import asyncio
import xml.etree.ElementTree as ET
from typing import Optional

import libvirt

from src.config import settings


def _open_conn() -> libvirt.virConnect:
    conn = libvirt.open(settings.libvirt_uri)
    if conn is None:
        raise RuntimeError("Failed to open libvirt connection")
    return conn


async def list_vms() -> list[dict]:
    def _list():
        conn = _open_conn()
        try:
            domains = conn.listAllDomains()
            result = []
            for d in domains:
                info = d.info()
                result.append({
                    "id": d.UUIDString(),
                    "name": d.name(),
                    "state": _state_name(info[0]),
                    "max_memory_mb": info[1] // 1024,
                    "memory_mb": info[2] // 1024,
                    "vcpus": info[3],
                    "cpu_time_ns": info[4],
                    "persistent": d.isPersistent(),
                    "autostart": d.autostart(),
                })
            return result
        finally:
            conn.close()
    return await asyncio.to_thread(_list)


async def get_vm(vm_id: str) -> Optional[dict]:
    def _get():
        conn = _open_conn()
        try:
            d = conn.lookupByUUIDString(vm_id)
            info = d.info()
            xml = d.XMLDesc()
            return {
                "id": d.UUIDString(),
                "name": d.name(),
                "state": _state_name(info[0]),
                "max_memory_mb": info[1] // 1024,
                "memory_mb": info[2] // 1024,
                "vcpus": info[3],
                "cpu_time_ns": info[4],
                "xml": xml,
            }
        except libvirt.libvirtError:
            return None
        finally:
            conn.close()
    return await asyncio.to_thread(_get)


async def create_vm(
    name: str,
    vcpus: int,
    memory_mb: int,
    disk_path: str,
    iso_path: Optional[str],
    network: str = "vmbr0",
) -> str:
    xml = _build_domain_xml(name, vcpus, memory_mb, disk_path, iso_path, network)
    def _create():
        conn = _open_conn()
        try:
            domain = conn.defineXML(xml)
            domain.create()
            return domain.UUIDString()
        finally:
            conn.close()
    return await asyncio.to_thread(_create)


async def vm_action(vm_id: str, action: str) -> dict:
    def _act():
        conn = _open_conn()
        try:
            d = conn.lookupByUUIDString(vm_id)
            if action == "start":
                d.create()
            elif action == "stop":
                d.destroy()
            elif action == "reboot":
                d.reboot()
            elif action == "suspend":
                d.suspend()
            elif action == "resume":
                d.resume()
            elif action == "shutdown":
                d.shutdown()
            else:
                raise ValueError(f"Unknown action: {action}")
            return {"status": "ok", "action": action}
        finally:
            conn.close()
    return await asyncio.to_thread(_act)


async def delete_vm(vm_id: str) -> None:
    def _del():
        conn = _open_conn()
        try:
            d = conn.lookupByUUIDString(vm_id)
            if d.isActive():
                d.destroy()
            d.undefineFlags(
                libvirt.VIR_DOMAIN_UNDEFINE_MANAGED_SAVE |
                libvirt.VIR_DOMAIN_UNDEFINE_SNAPSHOTS_METADATA
            )
        finally:
            conn.close()
    await asyncio.to_thread(_del)


async def get_vnc_info(vm_id: str) -> Optional[dict]:
    def _vnc():
        conn = _open_conn()
        try:
            d = conn.lookupByUUIDString(vm_id)
            xml = ET.fromstring(d.XMLDesc())
            graphics = xml.find(".//graphics[@type='vnc']")
            if graphics is None:
                return None
            return {
                "type": "vnc",
                "port": graphics.get("port"),
                "host": graphics.get("listen", "127.0.0.1"),
            }
        finally:
            conn.close()
    return await asyncio.to_thread(_vnc)


def _state_name(state: int) -> str:
    return {
        libvirt.VIR_DOMAIN_NOSTATE: "nostate",
        libvirt.VIR_DOMAIN_RUNNING: "running",
        libvirt.VIR_DOMAIN_BLOCKED: "blocked",
        libvirt.VIR_DOMAIN_PAUSED: "paused",
        libvirt.VIR_DOMAIN_SHUTDOWN: "shutdown",
        libvirt.VIR_DOMAIN_SHUTOFF: "shutoff",
        libvirt.VIR_DOMAIN_CRASHED: "crashed",
        libvirt.VIR_DOMAIN_PMSUSPENDED: "suspended",
    }.get(state, "unknown")


def _build_domain_xml(
    name: str,
    vcpus: int,
    memory_mb: int,
    disk_path: str,
    iso_path: Optional[str],
    network: str,
) -> str:
    cdrom_block = ""
    if iso_path:
        cdrom_block = f"""
    <disk type='file' device='cdrom'>
      <driver name='qemu' type='raw'/>
      <source file='{iso_path}'/>
      <target dev='sdb' bus='sata'/>
      <readonly/>
    </disk>"""

    return f"""<domain type='kvm'>
  <name>{name}</name>
  <memory unit='MiB'>{memory_mb}</memory>
  <vcpu>{vcpus}</vcpu>
  <os firmware='efi'>
    <type arch='x86_64' machine='q35'>hvm</type>
    <boot dev='hd'/>
    <boot dev='cdrom'/>
  </os>
  <features>
    <acpi/><apic/>
  </features>
  <cpu mode='host-passthrough'/>
  <devices>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2' cache='none' discard='unmap'/>
      <source file='{disk_path}'/>
      <target dev='vda' bus='virtio'/>
    </disk>{cdrom_block}
    <interface type='bridge'>
      <source bridge='{network}'/>
      <model type='virtio'/>
    </interface>
    <graphics type='vnc' port='-1' listen='127.0.0.1'/>
    <video>
      <model type='virtio'/>
    </video>
    <channel type='unix'>
      <target type='virtio' name='org.qemu.guest_agent.0'/>
    </channel>
    <rng model='virtio'>
      <backend model='random'>/dev/urandom</backend>
    </rng>
  </devices>
</domain>"""
