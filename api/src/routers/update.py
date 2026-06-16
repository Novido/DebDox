from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireViewer
from src.services import update_service

router = APIRouter(prefix="/api/update", tags=["update"])


@router.get("/status")
async def update_status(_=RequireViewer):
    return await update_service.get_status()


@router.post("/check")
async def check_updates(_=RequireAdmin):
    return await update_service.check_updates()


@router.get("/upgradable")
async def list_upgradable(_=RequireViewer):
    return await update_service.list_upgradable()


@router.post("/upgrade")
async def run_upgrade(full: bool = False, _=RequireAdmin):
    return await update_service.run_upgrade(full=full)


@router.get("/sources")
async def list_sources(_=RequireViewer):
    return await update_service.get_sources()


class SourceSave(BaseModel):
    content: str


@router.put("/sources/{filename}")
async def save_source(filename: str, body: SourceSave, _=RequireAdmin):
    try:
        return await update_service.save_source(filename, body.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/sources/{filename}", status_code=204)
async def delete_source(filename: str, _=RequireAdmin):
    try:
        await update_service.delete_source(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/history")
async def apt_history(lines: int = 100, _=RequireViewer):
    return {"log": await update_service.get_apt_history(lines)}


@router.get("/dpkg-log")
async def dpkg_log(lines: int = 100, _=RequireViewer):
    return {"log": await update_service.get_dpkg_log(lines)}
