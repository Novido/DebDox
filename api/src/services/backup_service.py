"""Backup service — BorgBackup for host files, ZFS send/receive for VMs/datasets."""
import asyncio
import os
from typing import Optional


async def _run(*args: str, env: dict = None) -> str:
    merged_env = {**os.environ, **(env or {})}
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=merged_env,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return stdout.decode().strip()


# --- Borg ---

async def borg_init(repo: str, passphrase: str = "", encryption: str = "none") -> dict:
    env = {"BORG_PASSPHRASE": passphrase} if passphrase else {"BORG_PASSPHRASE": ""}
    await _run("borg", "init", "--encryption", encryption, repo, env=env)
    return {"status": "initialized", "repo": repo}


async def borg_create(
    repo: str,
    archive_name: str,
    paths: list[str],
    exclude: list[str] = None,
    passphrase: str = "",
) -> dict:
    env = {"BORG_PASSPHRASE": passphrase}
    args = ["borg", "create", "--stats", "--compression", "lz4",
            f"{repo}::{archive_name}"] + paths
    for ex in (exclude or []):
        args += ["--exclude", ex]
    out = await _run(*args, env=env)
    return {"status": "created", "archive": f"{repo}::{archive_name}", "output": out}


async def borg_list(repo: str, passphrase: str = "") -> list[dict]:
    env = {"BORG_PASSPHRASE": passphrase}
    out = await _run("borg", "list", "--json", repo, env=env)
    import json
    data = json.loads(out)
    return data.get("archives", [])


async def borg_delete(repo: str, archive: str, passphrase: str = "") -> None:
    env = {"BORG_PASSPHRASE": passphrase}
    await _run("borg", "delete", f"{repo}::{archive}", env=env)


async def borg_prune(
    repo: str,
    keep_daily: int = 7,
    keep_weekly: int = 4,
    keep_monthly: int = 6,
    passphrase: str = "",
) -> dict:
    env = {"BORG_PASSPHRASE": passphrase}
    out = await _run(
        "borg", "prune",
        f"--keep-daily={keep_daily}",
        f"--keep-weekly={keep_weekly}",
        f"--keep-monthly={keep_monthly}",
        repo, env=env,
    )
    return {"status": "pruned", "output": out}


# --- ZFS send/receive ---

async def zfs_backup(
    source_dataset: str,
    snapshot: str,
    dest_host: str,
    dest_dataset: str,
    ssh_user: str = "root",
    incremental_from: Optional[str] = None,
) -> dict:
    src_snap = f"{source_dataset}@{snapshot}"
    if incremental_from:
        send_cmd = f"zfs send -Rp -i {source_dataset}@{incremental_from} {src_snap}"
    else:
        send_cmd = f"zfs send -Rp {src_snap}"

    proc = await asyncio.create_subprocess_shell(
        f"{send_cmd} | ssh {ssh_user}@{dest_host} zfs receive -F {dest_dataset}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return {
        "status": "completed",
        "source": src_snap,
        "destination": f"{dest_host}:{dest_dataset}",
        "incremental": incremental_from is not None,
    }


async def container_snapshot(
    container_id: str,
    dataset_path: str,
    snap_name: str,
) -> dict:
    """Snapshot a ZFS dataset backing a container's volume."""
    from src.services.zfs_service import create_snapshot
    return await create_snapshot(dataset_path, snap_name)
