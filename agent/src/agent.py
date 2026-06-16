"""debdox-agent — connects to the master's WebSocket and reports metrics."""
import asyncio
import json
import os
import socket
import logging

import websockets

from src.collectors import host as host_collector
from src.collectors import docker as docker_collector
from src.collectors import vms as vms_collector
from src.collectors import gpu as gpu_collector
from src import executor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("debdox-agent")

MASTER_URL = os.environ.get("DEBDOX_MASTER_URL", "ws://localhost:8080/api/cluster/ws/nodes")
NODE_ID = os.environ.get("DEBDOX_NODE_ID", socket.gethostname())
NODE_NAME = os.environ.get("DEBDOX_NODE_NAME", socket.gethostname())
METRICS_INTERVAL = int(os.environ.get("DEBDOX_METRICS_INTERVAL", "10"))


async def run():
    while True:
        try:
            async with websockets.connect(MASTER_URL, ping_interval=20) as ws:
                log.info("Connected to master at %s", MASTER_URL)

                # Register
                await ws.send(json.dumps({
                    "node_id": NODE_ID,
                    "name": NODE_NAME,
                    "type": "registration",
                }))

                # Start metrics sender and command receiver concurrently
                await asyncio.gather(
                    _send_metrics(ws),
                    _receive_commands(ws),
                )
        except (websockets.ConnectionClosed, OSError) as e:
            log.warning("Disconnected: %s — reconnecting in 10s", e)
            await asyncio.sleep(10)


async def _send_metrics(ws: websockets.WebSocketClientProtocol):
    while True:
        try:
            metrics = {
                "host": host_collector.collect(),
                "containers": docker_collector.collect(),
                "vms": vms_collector.collect(),
                "gpu": gpu_collector.collect(),
            }
            await ws.send(json.dumps({"type": "metrics", "data": metrics}))
        except Exception as e:
            log.error("Metric collection error: %s", e)
        await asyncio.sleep(METRICS_INTERVAL)


async def _receive_commands(ws: websockets.WebSocketClientProtocol):
    async for raw in ws:
        try:
            msg = json.loads(raw)
            if msg.get("type") == "ping":
                await ws.send(json.dumps({"type": "pong"}))
                continue
            if msg.get("type") == "command":
                result = await executor.execute(msg["command"], msg.get("args", {}))
                await ws.send(json.dumps({"type": "command_result", "id": msg.get("id"), "result": result}))
        except Exception as e:
            log.error("Command handling error: %s", e)


if __name__ == "__main__":
    asyncio.run(run())
