"""GPU discovery and management — NVIDIA (nvidia-smi) and generic PCI fallback."""
import asyncio
import json
import re


async def _run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    return stdout.decode().strip()


async def list_gpus() -> list[dict]:
    gpus = []

    # NVIDIA via nvidia-smi
    try:
        out = await _run(
            "nvidia-smi",
            "--query-gpu=gpu_uuid,name,memory.total,memory.used,utilization.gpu,temperature.gpu,driver_version",
            "--format=csv,noheader,nounits",
        )
        for line in out.splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 7:
                gpus.append({
                    "uuid": parts[0],
                    "name": parts[1],
                    "vendor": "nvidia",
                    "memory_total_mb": int(parts[2]),
                    "memory_used_mb": int(parts[3]),
                    "utilization_pct": int(parts[4]),
                    "temperature_c": int(parts[5]),
                    "driver_version": parts[6],
                })
    except (FileNotFoundError, Exception):
        pass

    # AMD via rocm-smi fallback
    if not gpus:
        try:
            out = await _run("rocm-smi", "--showallinfo", "--json")
            data = json.loads(out)
            for card_id, info in data.items():
                if "GPU" in card_id:
                    gpus.append({
                        "uuid": card_id,
                        "name": info.get("Card series", "AMD GPU"),
                        "vendor": "amd",
                        "memory_total_mb": 0,
                        "memory_used_mb": 0,
                        "utilization_pct": 0,
                        "temperature_c": int(info.get("Temperature (Sensor edge) (C)", 0)),
                        "driver_version": info.get("Driver version", ""),
                    })
        except (FileNotFoundError, Exception):
            pass

    # PCI fallback if nothing detected
    if not gpus:
        try:
            out = await _run("lspci", "-mm", "-D")
            for line in out.splitlines():
                if re.search(r"VGA|3D|Display", line, re.I):
                    parts = line.split('"')
                    gpus.append({
                        "uuid": line.split()[0],
                        "name": parts[5] if len(parts) > 5 else "Unknown GPU",
                        "vendor": "unknown",
                        "memory_total_mb": 0,
                        "memory_used_mb": 0,
                        "utilization_pct": 0,
                        "temperature_c": 0,
                        "driver_version": "",
                    })
        except FileNotFoundError:
            pass

    return gpus


async def get_vfio_devices() -> list[dict]:
    """List PCI devices currently bound to VFIO driver."""
    devices = []
    try:
        out = await _run("bash", "-c",
            "for d in /sys/bus/pci/drivers/vfio-pci/*/; do "
            "echo $(basename $d),$(cat $d/class 2>/dev/null),$(cat $d/vendor 2>/dev/null),$(cat $d/device 2>/dev/null); "
            "done")
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
    """Bind a PCI device to VFIO driver (for VM passthrough)."""
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
