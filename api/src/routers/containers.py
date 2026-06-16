from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireOperator, RequireViewer
from src.services import docker_service

router = APIRouter(prefix="/api/containers", tags=["containers"])


class ContainerCreate(BaseModel):
    image: str
    name: Optional[str] = None
    env: dict = {}
    ports: dict = {}
    volumes: dict = {}
    network: str = "bridge"
    gpu_ids: Optional[list[str]] = None
    restart_policy: str = "unless-stopped"


@router.get("/")
async def list_containers(all: bool = True, _=RequireViewer):
    return await docker_service.list_containers(all_=all)


@router.get("/{container_id}")
async def get_container(container_id: str, _=RequireViewer):
    ct = await docker_service.get_container(container_id)
    if not ct:
        raise HTTPException(status_code=404, detail="Container not found")
    return ct


@router.post("/", status_code=201)
async def create_container(body: ContainerCreate, _=RequireOperator):
    return await docker_service.create_container(
        image=body.image,
        name=body.name,
        env=body.env,
        ports=body.ports,
        volumes=body.volumes,
        network=body.network,
        gpu_ids=body.gpu_ids,
        restart_policy=body.restart_policy,
    )


@router.post("/{container_id}/{action}")
async def container_action(container_id: str, action: str, _=RequireOperator):
    allowed = {"start", "stop", "restart", "pause", "unpause"}
    if action not in allowed:
        raise HTTPException(status_code=400, detail=f"Action must be one of {allowed}")
    return await docker_service.container_action(container_id, action)


@router.get("/{container_id}/logs")
async def get_logs(container_id: str, tail: int = 200, _=RequireViewer):
    return {"logs": await docker_service.get_logs(container_id, tail)}


@router.delete("/{container_id}", status_code=204)
async def delete_container(container_id: str, force: bool = False, _=RequireAdmin):
    await docker_service.delete_container(container_id, force=force)


# --- Swarm ---

@router.get("/swarm/status")
async def swarm_status(_=RequireViewer):
    return await docker_service.get_swarm_status()


@router.post("/swarm/init")
async def swarm_init(advertise_addr: str, _=RequireAdmin):
    return await docker_service.swarm_init(advertise_addr)


@router.get("/swarm/services")
async def swarm_services(_=RequireViewer):
    return await docker_service.list_swarm_services()
