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
    async def list_nodes() -> list[TextContent]:
        """List all cluster nodes and their online status."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/cluster/nodes", headers=_headers())
            r.raise_for_status()
            nodes = r.json()
        lines = [
            f"- {n.get('name', n.get('node_id', '?'))}: {'online' if n.get('online') else 'offline'}"
            + (f" — CPU {n['metrics']['cpu']:.0f}%" if n.get("metrics", {}).get("cpu") is not None else "")
            for n in nodes
        ]
        return [TextContent(type="text", text="\n".join(lines) if lines else "No nodes connected.")]

    @server.tool()
    async def get_swarm_status() -> list[TextContent]:
        """Get Docker Swarm status including node count and managers."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/cluster/swarm", headers=_headers())
            r.raise_for_status()
            s = r.json()
        if not s.get("active"):
            return [TextContent(type="text", text="Docker Swarm is not active on this node.")]
        text = f"Swarm: active\nNode ID: {s.get('node_id')}\nNodes: {s.get('nodes')}\nManagers: {s.get('managers')}"
        return [TextContent(type="text", text=text)]
