import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireOperator, RequireViewer
from src.services import docker_service

router = APIRouter(prefix="/api/networks", tags=["networks"])


async def _run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return stdout.decode().strip()


class BridgeCreate(BaseModel):
    name: str
    ip_address: Optional[str] = None
    prefix: int = 24


class VlanCreate(BaseModel):
    parent: str
    vlan_id: int
    ip_address: Optional[str] = None


class DockerNetworkCreate(BaseModel):
    name: str
    driver: str = "bridge"
    options: dict = {}


@router.get("/bridges")
async def list_bridges(_=RequireViewer):
    out = await _run("ip", "-j", "link", "show", "type", "bridge")
    import json
    links = json.loads(out)
    bridges = []
    for link in links:
        name = link["ifname"]
        # Get address info
        try:
            addr_out = await _run("ip", "-j", "addr", "show", name)
            addrs = json.loads(addr_out)
            addr_info = addrs[0].get("addr_info", []) if addrs else []
        except Exception:
            addr_info = []
        bridges.append({
            "name": name,
            "state": link.get("operstate"),
            "mac": link.get("address"),
            "addresses": [f"{a['local']}/{a['prefixlen']}" for a in addr_info],
            "mtu": link.get("mtu"),
        })
    return bridges


@router.post("/bridges", status_code=201)
async def create_bridge(body: BridgeCreate, _=RequireAdmin):
    await _run("ip", "link", "add", body.name, "type", "bridge")
    await _run("ip", "link", "set", body.name, "up")
    if body.ip_address:
        await _run("ip", "addr", "add", f"{body.ip_address}/{body.prefix}", "dev", body.name)
    return {"name": body.name, "status": "created"}


@router.delete("/bridges/{name}", status_code=204)
async def delete_bridge(name: str, _=RequireAdmin):
    await _run("ip", "link", "set", name, "down")
    await _run("ip", "link", "del", name, "type", "bridge")


@router.post("/vlans", status_code=201)
async def create_vlan(body: VlanCreate, _=RequireAdmin):
    iface = f"{body.parent}.{body.vlan_id}"
    await _run("ip", "link", "add", "link", body.parent, "name", iface, "type", "vlan", "id", str(body.vlan_id))
    await _run("ip", "link", "set", iface, "up")
    if body.ip_address:
        await _run("ip", "addr", "add", body.ip_address, "dev", iface)
    return {"name": iface, "vlan_id": body.vlan_id, "status": "created"}


@router.get("/docker")
async def list_docker_networks(_=RequireViewer):
    return await docker_service.list_docker_networks()


@router.post("/docker", status_code=201)
async def create_docker_network(body: DockerNetworkCreate, _=RequireOperator):
    return await docker_service.create_docker_network(body.name, body.driver, body.options)
