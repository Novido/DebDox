from mcp.server import Server
from mcp.types import TextContent
import httpx
import os

API_BASE = os.environ.get("DEBDOX_API_URL", "http://localhost:8080/api")
API_KEY = os.environ.get("DEBDOX_API_KEY", "")


def _headers():
    return {"X-API-Key": API_KEY} if API_KEY else {}


def register(server: Server):
    @server.tool()
    async def list_containers() -> list[TextContent]:
        """List all Docker containers (running and stopped)."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/containers/", headers=_headers())
            r.raise_for_status()
            containers = r.json()
        lines = [f"- {ct['name']} ({ct['status']}) — {ct['image']}" for ct in containers]
        return [TextContent(type="text", text="\n".join(lines) if lines else "No containers.")]

    @server.tool()
    async def run_container(image: str, name: str = "", gpu_ids: str = "") -> list[TextContent]:
        """Run a new Docker container. Optionally specify name and GPU IDs ('all' for all GPUs)."""
        body = {"image": image}
        if name:
            body["name"] = name
        if gpu_ids:
            body["gpu_ids"] = gpu_ids.split(",")
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/containers/", json=body, headers=_headers())
            r.raise_for_status()
            ct = r.json()
        return [TextContent(type="text", text=f"Container '{ct['name']}' started (ID: {ct['id']}).")]

    @server.tool()
    async def stop_container(container_id: str) -> list[TextContent]:
        """Stop a running Docker container."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/containers/{container_id}/stop", headers=_headers())
            r.raise_for_status()
        return [TextContent(type="text", text=f"Container {container_id} stopped.")]

    @server.tool()
    async def get_container_logs(container_id: str, tail: int = 50) -> list[TextContent]:
        """Get the last N lines of logs from a container."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/containers/{container_id}/logs", params={"tail": tail}, headers=_headers())
            r.raise_for_status()
            data = r.json()
        return [TextContent(type="text", text=data.get("logs", ""))]
