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
    async def get_host_metrics() -> list[TextContent]:
        """Get current CPU, memory, disk, and load metrics for the host."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/monitoring/host", headers=_headers())
            r.raise_for_status()
            m = r.json()
        text = (
            f"CPU: {m.get('cpu_pct', 'N/A'):.1f}%\n"
            f"Memory: {m.get('memory_pct', 'N/A'):.1f}%\n"
            f"Disk: {m.get('disk_pct', 'N/A'):.1f}%\n"
            f"Load (1m): {m.get('load_1m', 'N/A'):.2f}"
        )
        return [TextContent(type="text", text=text)]

    @server.tool()
    async def get_container_metrics() -> list[TextContent]:
        """Get CPU and memory metrics for all running Docker containers."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/monitoring/containers", headers=_headers())
            r.raise_for_status()
            data = r.json()
        lines = []
        for item in data.get("cpu", []):
            name = item.get("labels", {}).get("name", "?")
            cpu = item.get("value")
            lines.append(f"- {name}: {f'{cpu:.1f}' if cpu is not None else 'N/A'}% CPU")
        return [TextContent(type="text", text="\n".join(lines) if lines else "No container metrics.")]
