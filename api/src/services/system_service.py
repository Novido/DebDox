"""Host system information — reads /proc and platform APIs."""
import asyncio
import platform
import re
import socket
from pathlib import Path


def _read(path: str) -> str:
    try:
        return Path(path).read_text(errors="replace").strip()
    except OSError:
        return ""


def _parse_cpuinfo() -> dict:
    cores_seen: set[str] = set()
    threads = 0
    model = ""
    freq_mhz = 0
    for line in _read("/proc/cpuinfo").splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if key == "model name" and not model:
            model = val
        if key == "cpu MHz" and not freq_mhz:
            try:
                freq_mhz = round(float(val))
            except ValueError:
                pass
        if key == "processor":
            threads += 1
        if key == "core id":
            cores_seen.add(val)
    return {
        "model": model or "Unknown CPU",
        "cores": len(cores_seen) if cores_seen else threads,
        "threads": threads,
        "freq_mhz": freq_mhz,
    }


def _parse_meminfo() -> dict:
    total_kb = avail_kb = 0
    for line in _read("/proc/meminfo").splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        kb = int(val.strip().split()[0]) if val.strip() else 0
        if key == "MemTotal":
            total_kb = kb
        elif key == "MemAvailable":
            avail_kb = kb
    used_kb = total_kb - avail_kb
    return {
        "total_mb": total_kb // 1024,
        "available_mb": avail_kb // 1024,
        "used_mb": used_kb // 1024,
        "used_pct": round(used_kb / total_kb * 100) if total_kb else 0,
    }


def _parse_os_release() -> str:
    for line in _read("/etc/os-release").splitlines():
        if line.startswith("PRETTY_NAME="):
            return line.split("=", 1)[1].strip('"')
    return platform.system()


def _parse_uptime() -> int:
    raw = _read("/proc/uptime")
    try:
        return int(float(raw.split()[0]))
    except (IndexError, ValueError):
        return 0


def _parse_load_avg() -> list[float]:
    raw = _read("/proc/loadavg")
    try:
        p = raw.split()
        return [float(p[0]), float(p[1]), float(p[2])]
    except (IndexError, ValueError):
        return [0.0, 0.0, 0.0]


async def get_system_info() -> dict:
    def _collect():
        uname = platform.uname()
        return {
            "hostname": socket.gethostname(),
            "os": _parse_os_release(),
            "kernel": uname.release,
            "arch": uname.machine,
            "uptime_seconds": _parse_uptime(),
            "load_avg": _parse_load_avg(),
            "cpu": _parse_cpuinfo(),
            "memory": _parse_meminfo(),
        }
    return await asyncio.to_thread(_collect)
