from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireViewer
from src.services import gpu_service

router = APIRouter(prefix="/api/gpu", tags=["gpu"])


class VFIOBind(BaseModel):
    pci_address: str
    vendor_id: str
    device_id: str


@router.get("/")
async def list_gpus(_=RequireViewer):
    return await gpu_service.list_gpus()


@router.get("/vfio")
async def list_vfio_devices(_=RequireViewer):
    return await gpu_service.get_vfio_devices()


@router.post("/vfio/bind")
async def bind_vfio(body: VFIOBind, _=RequireAdmin):
    return await gpu_service.bind_vfio(body.pci_address, body.vendor_id, body.device_id)
