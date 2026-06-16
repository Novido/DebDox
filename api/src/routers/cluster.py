import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireViewer
from src.services import cluster_service, docker_service

router = APIRouter(prefix="/api/cluster", tags=["cluster"])


class NodeCommand(BaseModel):
    command: str
    args: dict = {}


@router.get("/nodes")
async def list_nodes(_=RequireViewer):
    return cluster_service.list_nodes()


@router.get("/nodes/{node_id}")
async def get_node(node_id: str, _=RequireViewer):
    node = cluster_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.post("/nodes/{node_id}/command")
async def send_command(node_id: str, body: NodeCommand, _=RequireAdmin):
    return await cluster_service.send_command(node_id, {"command": body.command, "args": body.args})


@router.get("/swarm")
async def swarm_status(_=RequireViewer):
    return await docker_service.get_swarm_status()


@router.post("/swarm/init")
async def swarm_init(advertise_addr: str, _=RequireAdmin):
    return await docker_service.swarm_init(advertise_addr)


@router.get("/swarm/services")
async def swarm_services(_=RequireViewer):
    return await docker_service.list_swarm_services()


@router.websocket("/ws/nodes")
async def node_websocket(ws: WebSocket):
    """WebSocket endpoint for debdox-agent connections from nodes."""
    await ws.accept()
    node_id = None
    try:
        # First message must be a registration payload
        raw = await ws.receive_text()
        data = json.loads(raw)
        node_id = data.get("node_id")
        if not node_id:
            await ws.close(code=4001, reason="Missing node_id")
            return

        cluster_service.register_node(node_id, data, ws)

        async for message in ws.iter_text():
            payload = json.loads(message)
            msg_type = payload.get("type")
            if msg_type == "metrics":
                cluster_service.update_node_metrics(node_id, payload.get("data", {}))
            elif msg_type == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    finally:
        if node_id:
            cluster_service.unregister_node(node_id)


@router.websocket("/ws/events")
async def events_websocket(ws: WebSocket):
    """SSE-style WebSocket for UI clients to receive cluster events."""
    await ws.accept()
    queue = cluster_service.subscribe_events()
    try:
        while True:
            event = await queue.get()
            await ws.send_text(json.dumps(event))
    except WebSocketDisconnect:
        pass
    finally:
        cluster_service.unsubscribe_events(queue)
