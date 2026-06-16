"""APT package management — check/upgrade, sources editing, history."""
import asyncio
import os
import re
from datetime import datetime
from pathlib import Path

_APT_ENV = {
    **os.environ,
    "DEBIAN_FRONTEND": "noninteractive",
    "PATH": "/usr/bin:/bin:/usr/sbin:/sbin",
}
_SOURCES_ROOT = Path("/etc/apt")
_SOURCES_D = _SOURCES_ROOT / "sources.list.d"


async def _apt(*args: str, timeout: int = 300) -> dict:
    proc = await asyncio.create_subprocess_exec(
        "apt-get", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env=_APT_ENV,
    )
    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        return {"success": False, "output": "Command timed out.", "returncode": -1}
    return {
        "success": proc.returncode == 0,
        "output": stdout.decode("utf-8", errors="replace"),
        "returncode": proc.returncode,
    }


async def check_updates() -> dict:
    return await _apt("update")


async def list_upgradable() -> list[dict]:
    proc = await asyncio.create_subprocess_exec(
        "apt", "list", "--upgradable",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=_APT_ENV,
    )
    stdout, _ = await proc.communicate()
    packages: list[dict] = []
    for line in stdout.decode("utf-8", errors="replace").splitlines():
        # "pkg/suite new_ver arch [upgradable from: old_ver]"
        m = re.match(r'^(\S+)/(\S+)\s+(\S+)\s+(\S+)\s+\[upgradable from: (\S+)\]', line)
        if m:
            packages.append({
                "name": m.group(1),
                "suite": m.group(2),
                "new_version": m.group(3),
                "arch": m.group(4),
                "old_version": m.group(5),
                "is_security": "security" in m.group(2),
            })
    return packages


async def list_held() -> list[str]:
    proc = await asyncio.create_subprocess_exec(
        "apt-mark", "showhold",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    return [l.strip() for l in stdout.decode().splitlines() if l.strip()]


async def run_upgrade(full: bool = False) -> dict:
    cmd = "full-upgrade" if full else "upgrade"
    return await _apt(cmd, "-y", timeout=600)


async def autoremove_dry_run() -> dict:
    return await _apt("autoremove", "--dry-run")


async def last_update_time() -> str | None:
    for stamp in (
        Path("/var/lib/apt/periodic/update-success-stamp"),
        Path("/var/cache/apt/pkgcache.bin"),
    ):
        if stamp.exists():
            return datetime.fromtimestamp(stamp.stat().st_mtime).isoformat()
    return None


async def get_status() -> dict:
    upgradable = await list_upgradable()
    held = await list_held()
    last_check = await last_update_time()
    return {
        "upgradable_count": len(upgradable),
        "security_count": sum(1 for p in upgradable if p["is_security"]),
        "held_count": len(held),
        "held_packages": held,
        "last_check": last_check,
    }


# ── APT sources ───────────────────────────────────────────────────────────────

def _safe_target(filename: str) -> Path:
    name = Path(filename).name
    if name == "sources.list":
        return _SOURCES_ROOT / name
    if name.endswith((".list", ".sources")):
        return _SOURCES_D / name
    raise ValueError("Filename must be sources.list or end in .list / .sources")


async def get_sources() -> list[dict]:
    def _read():
        sources: list[dict] = []
        main = _SOURCES_ROOT / "sources.list"
        if main.exists():
            sources.append({
                "filename": "sources.list",
                "path": str(main),
                "content": main.read_text(errors="replace"),
                "deletable": False,
            })
        if _SOURCES_D.exists():
            for f in sorted(_SOURCES_D.iterdir()):
                if f.suffix in (".list", ".sources") and f.is_file():
                    sources.append({
                        "filename": f.name,
                        "path": str(f),
                        "content": f.read_text(errors="replace"),
                        "deletable": True,
                    })
        return sources
    return await asyncio.to_thread(_read)


async def save_source(filename: str, content: str) -> dict:
    def _write():
        target = _safe_target(filename)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            target.with_suffix(target.suffix + ".bak").write_text(
                target.read_text(errors="replace")
            )
        target.write_text(content)
        return {"filename": target.name, "written": len(content)}
    return await asyncio.to_thread(_write)


async def delete_source(filename: str) -> None:
    def _del():
        name = Path(filename).name
        if name == "sources.list":
            raise ValueError("Cannot delete /etc/apt/sources.list")
        target = _SOURCES_D / name
        if not target.exists():
            raise FileNotFoundError(f"{name} not found")
        target.unlink()
    await asyncio.to_thread(_del)


# ── Logs ──────────────────────────────────────────────────────────────────────

async def get_apt_history(lines: int = 100) -> str:
    def _read():
        p = Path("/var/log/apt/history.log")
        if not p.exists():
            return "APT history log not found."
        all_lines = p.read_text(errors="replace").splitlines()
        return "\n".join(all_lines[-lines:])
    return await asyncio.to_thread(_read)


async def get_dpkg_log(lines: int = 100) -> str:
    def _read():
        p = Path("/var/log/dpkg.log")
        if not p.exists():
            return "dpkg log not found."
        all_lines = p.read_text(errors="replace").splitlines()
        return "\n".join(all_lines[-lines:])
    return await asyncio.to_thread(_read)
