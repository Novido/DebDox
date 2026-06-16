from mcp.server import Server
from mcp.types import Tool, TextContent
import httpx
import os

API_BASE = os.environ.get("DEBDOX_API_URL", "http://localhost:8080/api")
API_KEY = os.environ.get("DEBDOX_API_KEY", "")


def _headers():
    return {"X-API-Key": API_KEY} if API_KEY else {}


def register(server: Server):
    @server.tool()
    async def list_vms() -> list[TextContent]:
        """List all virtual machines with their current state."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/vms/", headers=_headers())
            r.raise_for_status()
            vms = r.json()
        lines = [f"- {v['name']} ({v['state']}) — {v['vcpus']} vCPUs, {v['max_memory_mb']} MB RAM" for v in vms]
        return [TextContent(type="text", text="\n".join(lines) if lines else "No VMs found.")]

    @server.tool()
    async def start_vm(vm_id: str) -> list[TextContent]:
        """Start a virtual machine by its UUID."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/vms/{vm_id}/start", headers=_headers())
            r.raise_for_status()
        return [TextContent(type="text", text=f"VM {vm_id} started.")]

    @server.tool()
    async def stop_vm(vm_id: str) -> list[TextContent]:
        """Stop (force off) a virtual machine by its UUID."""
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{API_BASE}/vms/{vm_id}/stop", headers=_headers())
            r.raise_for_status()
        return [TextContent(type="text", text=f"VM {vm_id} stopped.")]

    @server.tool()
    async def get_vm(vm_id: str) -> list[TextContent]:
        """Get detailed information about a specific VM."""
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{API_BASE}/vms/{vm_id}", headers=_headers())
            r.raise_for_status()
            vm = r.json()
        return [TextContent(type="text", text=str(vm))]
