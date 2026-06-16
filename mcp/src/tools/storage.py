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
    async def list_storage_pools() -> list[TextContent]:
        """List all ZFS storage pools with health and capacity."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/storage/pools", headers=_headers())
            r.raise_for_status()
            pools = r.json()
        lines = [f"- {p['name']}: {p['health']} — {p['capacity']} used of {p['size']}" for p in pools]
        return [TextContent(type="text", text="\n".join(lines) if lines else "No pools.")]

    @server.tool()
    async def create_snapshot(dataset: str, name: str) -> list[TextContent]:
        """Create a ZFS snapshot of a dataset."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/storage/snapshots", json={"dataset": dataset, "name": name}, headers=_headers())
            r.raise_for_status()
            result = r.json()
        return [TextContent(type="text", text=f"Snapshot created: {result.get('name', dataset + '@' + name)}")]

    @server.tool()
    async def list_snapshots(dataset: str = "") -> list[TextContent]:
        """List ZFS snapshots, optionally filtered by dataset."""
        params = {"dataset": dataset} if dataset else {}
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/storage/snapshots", params=params, headers=_headers())
            r.raise_for_status()
            snaps = r.json()
        lines = [f"- {s['name']} (used: {s['used']}, created: {s['creation']})" for s in snaps]
        return [TextContent(type="text", text="\n".join(lines) if lines else "No snapshots.")]
