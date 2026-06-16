"""GPU discovery and management — NVIDIA, AMD, and generic PCI fallback."""
import asyncio
import json
import re
import subprocess


async def _run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    return stdout.decode().strip()


def _pci_ids(pci_address: str) -> tuple[str, str]:
    """Return (vendor_id, device_id) hex strings for a PCI address via lspci -n."""
    try:
        out = subprocess.check_output(
            ["lspci", "-n", "-s", pci_address],
            text=True, timeout=3, stderr=subprocess.DEVNULL,
        )
        m = re.search(r'\s([0-9a-f]{4}):([0-9a-f]{4})', out.lower())
        if m:
            return "0x" + m.group(1), "0x" + m.group(2)
    except Exception:
        pass
    return ("", "")


async def list_gpus() -> list[dict]:
    gpus: list[dict] = []

    # --- NVIDIA via nvidia-smi ---
    try:
        out = await _run(
            "nvidia-smi",
            "--query-gpu=gpu_uuid,name,memory.total,memory.used,utilization.gpu,temperature.gpu,driver_version,pci.bus_id",
            "--format=csv,noheader,nounits",
        )
        for line in out.splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 8:
                raw_pci = parts[7]
                # nvidia-smi returns "00000000:01:00.0" — normalise to "0000:01:00.0"
                pci_address = re.sub(r'^0+([0-9a-fA-F]{4}):', r'\1:', raw_pci)
                vendor_id, device_id = _pci_ids(pci_address)
                gpus.append({
                    "uuid": parts[0],
                    "name": parts[1],
                    "vendor": "nvidia",
                    "memory_total_mb": int(parts[2]),
                    "memory_used_mb": int(parts[3]),
                    "utilization_pct": int(parts[4]),
                    "temperature_c": int(parts[5]),
                    "driver_version": parts[6],
                    "pci_address": pci_address,
                    "pci_vendor_id": vendor_id or "0x10de",
                    "pci_device_id": device_id,
                })
    except (FileNotFoundError, Exception):
        pass

    # --- AMD via rocm-smi ---
    if not gpus:
        try:
            info_out = await _run("rocm-smi", "--showallinfo", "--json")
            bus_out = await _run("rocm-smi", "--showbus", "--json")
            info_data = json.loads(info_out)
            bus_data: dict = {}
            try:
                bus_data = json.loads(bus_out)
            except Exception:
                pass

            for card_id, info in info_data.items():
                if "GPU" not in card_id:
                    continue
                pci_address = ""
                if card_id in bus_data:
                    pci_address = bus_data[card_id].get("PCI Bus", "")
                vendor_id, device_id = _pci_ids(pci_address) if pci_address else ("", "")
                gpus.append({
                    "uuid": card_id,
                    "name": info.get("Card series", "AMD GPU"),
                    "vendor": "amd",
                    "memory_total_mb": 0,
                    "memory_used_mb": 0,
                    "utilization_pct": 0,
                    "temperature_c": int(info.get("Temperature (Sensor edge) (C)", 0)),
                    "driver_version": info.get("Driver version", ""),
                    "pci_address": pci_address,
                    "pci_vendor_id": vendor_id or "0x1002",
                    "pci_device_id": device_id,
                })
        except (FileNotFoundError, Exception):
            pass

    # --- Generic PCI fallback ---
    if not gpus:
        try:
            out = await _run("lspci", "-mm", "-D")
            for line in out.splitlines():
                if re.search(r"VGA|3D|Display", line, re.I):
                    pci_address = line.split()[0]
                    parts = line.split('"')
                    vendor_id, device_id = _pci_ids(pci_address)
                    gpus.append({
                        "uuid": pci_address,
                        "name": parts[5] if len(parts) > 5 else "Unknown GPU",
                        "vendor": "unknown",
                        "memory_total_mb": 0,
                        "memory_used_mb": 0,
                        "utilization_pct": 0,
                        "temperature_c": 0,
                        "driver_version": "",
                        "pci_address": pci_address,
                        "pci_vendor_id": vendor_id,
                        "pci_device_id": device_id,
                    })
        except FileNotFoundError:
            pass

    return gpus


async def get_vfio_devices() -> list[dict]:
    """List PCI devices currently bound to the vfio-pci driver."""
    devices: list[dict] = []
    try:
        out = await _run(
            "bash", "-c",
            "for d in /sys/bus/pci/drivers/vfio-pci/*/; do "
            "echo $(basename $d),$(cat $d/class 2>/dev/null),$(cat $d/vendor 2>/dev/null),$(cat $d/device 2>/dev/null); "
            "done",
        )
        for line in out.splitlines():
            if line:
                parts = line.split(",")
                devices.append({
                    "pci_address": parts[0],
                    "class": parts[1] if len(parts) > 1 else "",
                    "vendor_id": parts[2] if len(parts) > 2 else "",
                    "device_id": parts[3] if len(parts) > 3 else "",
                })
    except Exception:
        pass
    return devices


async def bind_vfio(pci_address: str, vendor_id: str, device_id: str) -> dict:
    """Bind a PCI device to the vfio-pci driver for VM passthrough."""
    pci_id = f"{vendor_id.replace('0x', '')}:{device_id.replace('0x', '')}"
    proc = await asyncio.create_subprocess_shell(
        f"echo '{pci_id}' > /sys/bus/pci/drivers/vfio-pci/new_id && "
        f"echo '{pci_address}' > /sys/bus/pci/devices/{pci_address}/driver/unbind && "
        f"echo '{pci_address}' > /sys/bus/pci/drivers/vfio-pci/bind",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return {"status": "bound", "pci_address": pci_address, "driver": "vfio-pci"}


async def unbind_vfio(pci_address: str) -> dict:
    """Unbind a PCI device from vfio-pci so the host driver can reclaim it."""
    proc = await asyncio.create_subprocess_shell(
        f"echo '{pci_address}' > /sys/bus/pci/drivers/vfio-pci/unbind",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return {"status": "unbound", "pci_address": pci_address}
