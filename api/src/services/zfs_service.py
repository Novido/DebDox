"""ZFS service — drives the zfs/zpool CLI via subprocess."""
import asyncio
import json
import subprocess
from typing import Optional


async def _run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return stdout.decode().strip()


async def list_pools() -> list[dict]:
    out = await _run("zpool", "list", "-H", "-o", "name,size,alloc,free,frag,cap,health")
    pools = []
    for line in out.splitlines():
        parts = line.split("\t")
        pools.append({
            "name": parts[0],
            "size": parts[1],
            "allocated": parts[2],
            "free": parts[3],
            "fragmentation": parts[4],
            "capacity": parts[5],
            "health": parts[6],
        })
    return pools


async def list_datasets(pool: Optional[str] = None) -> list[dict]:
    args = ["zfs", "list", "-H", "-o", "name,used,avail,refer,mountpoint,type"]
    if pool:
        args.append(pool)
    out = await _run(*args)
    datasets = []
    for line in out.splitlines():
        parts = line.split("\t")
        datasets.append({
            "name": parts[0],
            "used": parts[1],
            "available": parts[2],
            "referenced": parts[3],
            "mountpoint": parts[4],
            "type": parts[5],
        })
    return datasets


async def create_dataset(name: str, properties: dict = None) -> dict:
    args = ["zfs", "create"]
    for k, v in (properties or {}).items():
        args += ["-o", f"{k}={v}"]
    args.append(name)
    await _run(*args)
    return {"name": name, "status": "created"}


async def list_snapshots(dataset: Optional[str] = None) -> list[dict]:
    args = ["zfs", "list", "-H", "-t", "snapshot", "-o", "name,used,refer,creation"]
    if dataset:
        args.append(dataset)
    out = await _run(*args)
    snaps = []
    for line in out.splitlines():
        if not line:
            continue
        parts = line.split("\t")
        snaps.append({"name": parts[0], "used": parts[1], "referenced": parts[2], "creation": parts[3]})
    return snaps


async def create_snapshot(dataset: str, snap_name: str, recursive: bool = False) -> dict:
    full_name = f"{dataset}@{snap_name}"
    args = ["zfs", "snapshot"]
    if recursive:
        args.append("-r")
    args.append(full_name)
    await _run(*args)
    return {"name": full_name, "status": "created"}


async def delete_snapshot(snapshot: str) -> None:
    await _run("zfs", "destroy", snapshot)


async def rollback_snapshot(snapshot: str) -> None:
    await _run("zfs", "rollback", "-r", snapshot)


async def create_zvol(name: str, size: str, sparse: bool = True) -> dict:
    args = ["zfs", "create", "-V", size]
    if sparse:
        args.append("-s")
    args += ["-o", "volblocksize=64K", name]
    await _run(*args)
    return {"name": name, "size": size, "device": f"/dev/zvol/{name}"}


async def replicate(
    source_dataset: str,
    snapshot: str,
    dest_host: str,
    dest_dataset: str,
    ssh_user: str = "root",
) -> dict:
    """Send snapshot to remote host via SSH."""
    proc = await asyncio.create_subprocess_shell(
        f"zfs send -Rp {source_dataset}@{snapshot} | ssh {ssh_user}@{dest_host} zfs receive -F {dest_dataset}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return {"status": "replicated", "source": f"{source_dataset}@{snapshot}", "destination": f"{dest_host}:{dest_dataset}"}


async def set_property(dataset: str, key: str, value: str) -> None:
    await _run("zfs", "set", f"{key}={value}", dataset)
