from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireOperator, RequireViewer
from src.services import libvirt_service, zfs_service

router = APIRouter(prefix="/api/vms", tags=["vms"])


class VMCreate(BaseModel):
    name: str
    vcpus: int = 2
    memory_mb: int = 2048
    disk_gb: int = 20
    iso_path: Optional[str] = None
    network: str = "vmbr0"
    zfs_dataset: str = "debdox-pool/vms"


class SnapshotCreate(BaseModel):
    name: str
    recursive: bool = False


@router.get("/")
async def list_vms(_=RequireViewer):
    return await libvirt_service.list_vms()


@router.get("/{vm_id}")
async def get_vm(vm_id: str, _=RequireViewer):
    vm = await libvirt_service.get_vm(vm_id)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    return vm


@router.post("/", status_code=201)
async def create_vm(body: VMCreate, _=RequireOperator):
    dataset = f"{body.zfs_dataset}/{body.name}"
    zvol = f"{dataset}/disk"
    await zfs_service.create_dataset(dataset)
    await zfs_service.create_zvol(zvol, f"{body.disk_gb}G")
    disk_path = f"/dev/zvol/{zvol}"
    vm_id = await libvirt_service.create_vm(
        name=body.name,
        vcpus=body.vcpus,
        memory_mb=body.memory_mb,
        disk_path=disk_path,
        iso_path=body.iso_path,
        network=body.network,
    )
    return {"id": vm_id, "name": body.name}


@router.delete("/{vm_id}", status_code=204)
async def delete_vm(vm_id: str, _=RequireAdmin):
    vm = await libvirt_service.get_vm(vm_id)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    await libvirt_service.delete_vm(vm_id)


@router.post("/{vm_id}/{action}")
async def vm_action(vm_id: str, action: str, _=RequireOperator):
    allowed = {"start", "stop", "reboot", "suspend", "resume", "shutdown"}
    if action not in allowed:
        raise HTTPException(status_code=400, detail=f"Action must be one of {allowed}")
    return await libvirt_service.vm_action(vm_id, action)


@router.post("/{vm_id}/snapshots")
async def create_snapshot(vm_id: str, body: SnapshotCreate, _=RequireOperator):
    vm = await libvirt_service.get_vm(vm_id)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    dataset = f"debdox-pool/vms/{vm['name']}/disk"
    return await zfs_service.create_snapshot(dataset, body.name, body.recursive)


@router.get("/{vm_id}/console")
async def get_console(vm_id: str, _=RequireViewer):
    info = await libvirt_service.get_vnc_info(vm_id)
    if not info:
        raise HTTPException(status_code=404, detail="No console available")
    return info
