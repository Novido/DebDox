"""DebDox MCP Server — exposes hypervisor operations as MCP tools for AI assistants."""
import asyncio
import os

from mcp.server import Server
from mcp.server.stdio import stdio_server

from src.tools import vms, containers, monitoring, storage, cluster

SERVER_NAME = "debdox"
SERVER_VERSION = "1.0.0"

app = Server(SERVER_NAME)

# Register all tool groups
vms.register(app)
containers.register(app)
monitoring.register(app)
storage.register(app)
cluster.register(app)


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
