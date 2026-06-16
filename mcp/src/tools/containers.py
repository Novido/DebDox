from mcp.server import Server
from mcp.types import TextContent
import httpx
import json
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
    async def inspect_container(container_id: str) -> list[TextContent]:
        """Get full details of a Docker container (config, mounts, ports, state)."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/containers/{container_id}/inspect", headers=_headers())
            r.raise_for_status()
            data = r.json()
        return [TextContent(type="text", text=json.dumps(data, indent=2))]

    @server.tool()
    async def run_container(image: str, name: str = "", gpu_ids: str = "") -> list[TextContent]:
        """Run a new Docker container. Optionally specify name and GPU IDs ('all' for all GPUs)."""
        body: dict = {"image": image}
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
    async def start_container(container_id: str) -> list[TextContent]:
        """Start a stopped Docker container."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/containers/{container_id}/start", headers=_headers())
            r.raise_for_status()
        return [TextContent(type="text", text=f"Container {container_id} started.")]

    @server.tool()
    async def stop_container(container_id: str) -> list[TextContent]:
        """Stop a running Docker container."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/containers/{container_id}/stop", headers=_headers())
            r.raise_for_status()
        return [TextContent(type="text", text=f"Container {container_id} stopped.")]

    @server.tool()
    async def restart_container(container_id: str) -> list[TextContent]:
        """Restart a Docker container."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/containers/{container_id}/restart", headers=_headers())
            r.raise_for_status()
        return [TextContent(type="text", text=f"Container {container_id} restarted.")]

    @server.tool()
    async def remove_container(container_id: str, force: str = "false") -> list[TextContent]:
        """Remove a Docker container. Set force='true' to remove even if running."""
        async with httpx.AsyncClient() as c:
            r = await c.delete(
                f"{API_BASE}/containers/{container_id}",
                params={"force": force.lower() == "true"},
                headers=_headers(),
            )
            r.raise_for_status()
        return [TextContent(type="text", text=f"Container {container_id} removed.")]

    @server.tool()
    async def exec_in_container(
        container_id: str,
        command: str,
        workdir: str = "",
    ) -> list[TextContent]:
        """Execute a command inside a running Docker container and return stdout/stderr.

        Args:
            container_id: Container ID or name.
            command: Command to run (e.g. 'ls /app' or 'python manage.py migrate').
            workdir: Optional working directory inside the container.
        """
        body: dict = {"command": command}
        if workdir:
            body["workdir"] = workdir
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(
                f"{API_BASE}/containers/{container_id}/exec",
                json=body,
                headers=_headers(),
            )
            r.raise_for_status()
            result = r.json()
        exit_code = result.get("exit_code", -1)
        output = result.get("output", "")
        status = "OK" if exit_code == 0 else f"FAILED (exit {exit_code})"
        text = f"[{status}]\n{output}" if output else f"[{status}]"
        return [TextContent(type="text", text=text)]

    @server.tool()
    async def get_container_logs(container_id: str, tail: int = 50) -> list[TextContent]:
        """Get the last N lines of logs from a container."""
        async with httpx.AsyncClient() as c:
            r = await c.get(
                f"{API_BASE}/containers/{container_id}/logs",
                params={"tail": tail},
                headers=_headers(),
            )
            r.raise_for_status()
            data = r.json()
        return [TextContent(type="text", text=data.get("logs", ""))]
