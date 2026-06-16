from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireOperator, RequireViewer
from src.services import zfs_service, backup_service

router = APIRouter(prefix="/api/storage", tags=["storage"])


class DatasetCreate(BaseModel):
    name: str
    properties: dict = {}


class SnapshotCreate(BaseModel):
    dataset: str
    name: str
    recursive: bool = False


class ReplicateRequest(BaseModel):
    source_dataset: str
    snapshot: str
    dest_host: str
    dest_dataset: str
    ssh_user: str = "root"
    incremental_from: Optional[str] = None


class BorgBackupRequest(BaseModel):
    repo: str
    archive_name: str
    paths: list[str]
    exclude: list[str] = []
    passphrase: str = ""


@router.get("/pools")
async def list_pools(_=RequireViewer):
    return await zfs_service.list_pools()


@router.get("/datasets")
async def list_datasets(pool: Optional[str] = None, _=RequireViewer):
    return await zfs_service.list_datasets(pool)


@router.post("/datasets", status_code=201)
async def create_dataset(body: DatasetCreate, _=RequireOperator):
    return await zfs_service.create_dataset(body.name, body.properties)


@router.get("/snapshots")
async def list_snapshots(dataset: Optional[str] = None, _=RequireViewer):
    return await zfs_service.list_snapshots(dataset)


@router.post("/snapshots", status_code=201)
async def create_snapshot(body: SnapshotCreate, _=RequireOperator):
    return await zfs_service.create_snapshot(body.dataset, body.name, body.recursive)


@router.delete("/snapshots/{snapshot:path}", status_code=204)
async def delete_snapshot(snapshot: str, _=RequireAdmin):
    await zfs_service.delete_snapshot(snapshot)


@router.post("/snapshots/{snapshot:path}/rollback")
async def rollback_snapshot(snapshot: str, _=RequireAdmin):
    await zfs_service.rollback_snapshot(snapshot)
    return {"status": "rolled back", "snapshot": snapshot}


@router.post("/replicate")
async def replicate(body: ReplicateRequest, _=RequireAdmin):
    return await backup_service.zfs_backup(
        source_dataset=body.source_dataset,
        snapshot=body.snapshot,
        dest_host=body.dest_host,
        dest_dataset=body.dest_dataset,
        ssh_user=body.ssh_user,
        incremental_from=body.incremental_from,
    )


@router.post("/backup/borg/init")
async def borg_init(repo: str, passphrase: str = "", _=RequireAdmin):
    return await backup_service.borg_init(repo, passphrase)


@router.post("/backup/borg/create")
async def borg_create(body: BorgBackupRequest, _=RequireAdmin):
    return await backup_service.borg_create(
        repo=body.repo,
        archive_name=body.archive_name,
        paths=body.paths,
        exclude=body.exclude,
        passphrase=body.passphrase,
    )


@router.get("/backup/borg/list")
async def borg_list(repo: str, passphrase: str = "", _=RequireViewer):
    return await backup_service.borg_list(repo, passphrase)


@router.post("/backup/borg/prune")
async def borg_prune(
    repo: str,
    keep_daily: int = 7,
    keep_weekly: int = 4,
    keep_monthly: int = 6,
    passphrase: str = "",
    _=RequireAdmin,
):
    return await backup_service.borg_prune(repo, keep_daily, keep_weekly, keep_monthly, passphrase)
