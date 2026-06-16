"""Cluster management — tracks nodes connected via WebSocket."""
import asyncio
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict

import websockets

# In-memory node registry (supplemented by DB for persistence)
_nodes: dict[str, dict] = {}
_node_ws: dict[str, websockets.WebSocketServerProtocol] = {}
_listeners: list[asyncio.Queue] = []


def register_node(node_id: str, info: dict, ws) -> None:
    _nodes[node_id] = {**info, "connected_at": datetime.now(timezone.utc).isoformat(), "online": True}
    _node_ws[node_id] = ws
    _broadcast_event({"type": "node_connected", "node_id": node_id})


def unregister_node(node_id: str) -> None:
    if node_id in _nodes:
        _nodes[node_id]["online"] = False
    _node_ws.pop(node_id, None)
    _broadcast_event({"type": "node_disconnected", "node_id": node_id})


def update_node_metrics(node_id: str, metrics: dict) -> None:
    if node_id in _nodes:
        _nodes[node_id]["metrics"] = metrics
        _nodes[node_id]["last_seen"] = datetime.now(timezone.utc).isoformat()


def list_nodes() -> list[dict]:
    return list(_nodes.values())


def get_node(node_id: str) -> Optional[dict]:
    return _nodes.get(node_id)


async def send_command(node_id: str, command: dict) -> dict:
    ws = _node_ws.get(node_id)
    if not ws:
        raise RuntimeError(f"Node {node_id!r} not connected")
    import json
    await ws.send(json.dumps(command))
    return {"status": "sent", "node_id": node_id, "command": command}


def subscribe_events() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _listeners.append(q)
    return q


def unsubscribe_events(q: asyncio.Queue) -> None:
    try:
        _listeners.remove(q)
    except ValueError:
        pass


def _broadcast_event(event: dict) -> None:
    for q in _listeners:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass
