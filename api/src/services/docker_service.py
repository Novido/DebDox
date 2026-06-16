"""Docker service — wraps docker-py SDK."""
import asyncio
from typing import Optional

import docker
from docker.errors import NotFound, APIError

from src.config import settings


def _client() -> docker.DockerClient:
    return docker.DockerClient(base_url=settings.docker_socket)


async def list_containers(all_: bool = True) -> list[dict]:
    def _list():
        c = _client()
        containers = c.containers.list(all=all_)
        return [_container_dict(ct) for ct in containers]
    return await asyncio.to_thread(_list)


async def get_container(container_id: str) -> Optional[dict]:
    def _get():
        c = _client()
        try:
            ct = c.containers.get(container_id)
            return _container_dict(ct)
        except NotFound:
            return None
    return await asyncio.to_thread(_get)


async def create_container(
    image: str,
    name: Optional[str],
    env: dict,
    ports: dict,
    volumes: dict,
    network: str = "bridge",
    gpu_ids: Optional[list[str]] = None,
    restart_policy: str = "unless-stopped",
) -> dict:
    def _create():
        c = _client()
        device_requests = []
        if gpu_ids:
            device_requests.append(
                docker.types.DeviceRequest(
                    device_ids=gpu_ids,
                    capabilities=[["gpu"]],
                )
            )
        ct = c.containers.run(
            image,
            name=name,
            environment=env,
            ports=ports,
            volumes=volumes,
            network=network,
            device_requests=device_requests or None,
            restart_policy={"Name": restart_policy},
            detach=True,
        )
        return _container_dict(ct)
    return await asyncio.to_thread(_create)


async def container_action(container_id: str, action: str) -> dict:
    def _act():
        c = _client()
        ct = c.containers.get(container_id)
        getattr(ct, action)()
        ct.reload()
        return _container_dict(ct)
    return await asyncio.to_thread(_act)


async def get_logs(container_id: str, tail: int = 200) -> str:
    def _logs():
        c = _client()
        ct = c.containers.get(container_id)
        return ct.logs(tail=tail, timestamps=True).decode("utf-8", errors="replace")
    return await asyncio.to_thread(_logs)


async def delete_container(container_id: str, force: bool = False) -> None:
    def _del():
        c = _client()
        ct = c.containers.get(container_id)
        ct.remove(force=force)
    await asyncio.to_thread(_del)


async def exec_in_container(
    container_id: str,
    command: str | list[str],
    workdir: str | None = None,
) -> dict:
    def _exec():
        c = _client()
        ct = c.containers.get(container_id)
        result = ct.exec_run(command, workdir=workdir, demux=False)
        return {
            "exit_code": result.exit_code,
            "output": result.output.decode("utf-8", errors="replace") if result.output else "",
        }
    return await asyncio.to_thread(_exec)


async def inspect_container(container_id: str) -> dict:
    def _inspect():
        c = _client()
        ct = c.containers.get(container_id)
        ct.reload()
        return ct.attrs
    return await asyncio.to_thread(_inspect)


async def list_docker_networks() -> list[dict]:
    def _nets():
        c = _client()
        return [
            {"id": n.id, "name": n.name, "driver": n.attrs.get("Driver"), "scope": n.attrs.get("Scope")}
            for n in c.networks.list()
        ]
    return await asyncio.to_thread(_nets)


async def create_docker_network(name: str, driver: str = "bridge", options: dict = None) -> dict:
    def _create():
        c = _client()
        n = c.networks.create(name, driver=driver, options=options or {})
        return {"id": n.id, "name": n.name}
    return await asyncio.to_thread(_create)


async def get_swarm_status() -> dict:
    def _swarm():
        c = _client()
        try:
            info = c.info()
            swarm = info.get("Swarm", {})
            return {
                "active": swarm.get("LocalNodeState") == "active",
                "node_id": swarm.get("NodeID"),
                "manager": swarm.get("ControlAvailable", False),
                "nodes": swarm.get("Nodes", 0),
                "managers": swarm.get("Managers", 0),
            }
        except APIError:
            return {"active": False}
    return await asyncio.to_thread(_swarm)


async def swarm_init(advertise_addr: str) -> dict:
    def _init():
        c = _client()
        token = c.swarm.init(advertise_addr=advertise_addr)
        return {"join_token_worker": c.swarm.attrs["JoinTokens"]["Worker"],
                "join_token_manager": c.swarm.attrs["JoinTokens"]["Manager"],
                "advertise_addr": advertise_addr}
    return await asyncio.to_thread(_init)


async def list_swarm_services() -> list[dict]:
    def _svcs():
        c = _client()
        try:
            return [
                {"id": s.id, "name": s.name, "replicas": s.attrs.get("Spec", {}).get("Mode", {}).get("Replicated", {}).get("Replicas")}
                for s in c.services.list()
            ]
        except APIError:
            return []
    return await asyncio.to_thread(_svcs)


def _container_dict(ct) -> dict:
    ct.reload()
    return {
        "id": ct.id[:12],
        "name": ct.name,
        "image": ct.image.tags[0] if ct.image.tags else ct.image.short_id,
        "status": ct.status,
        "state": ct.attrs.get("State", {}),
        "ports": ct.ports,
        "created": ct.attrs.get("Created"),
        "labels": ct.labels,
    }
