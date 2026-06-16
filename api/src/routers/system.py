from fastapi import APIRouter
from src.auth.rbac import RequireViewer
from src.services import system_service

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/info")
async def system_info(_=RequireViewer):
    return await system_service.get_system_info()
