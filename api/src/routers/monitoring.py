import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException
import httpx

from src.auth.rbac import RequireViewer
from src.config import settings

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


async def _query_prometheus(query: str, start: Optional[str] = None, end: Optional[str] = None, step: str = "60s") -> dict:
    async with httpx.AsyncClient() as client:
        if start and end:
            resp = await client.get(
                f"{settings.prometheus_url}/api/v1/query_range",
                params={"query": query, "start": start, "end": end, "step": step},
                timeout=10,
            )
        else:
            resp = await client.get(
                f"{settings.prometheus_url}/api/v1/query",
                params={"query": query},
                timeout=10,
            )
        resp.raise_for_status()
        return resp.json()


@router.get("/host")
async def host_metrics(_=RequireViewer):
    cpu = await _query_prometheus('100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)')
    mem = await _query_prometheus('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100')
    disk = await _query_prometheus('100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)')
    load = await _query_prometheus('node_load1')
    return {
        "cpu_pct": _extract_value(cpu),
        "memory_pct": _extract_value(mem),
        "disk_pct": _extract_value(disk),
        "load_1m": _extract_value(load),
    }


@router.get("/vms")
async def vm_metrics(_=RequireViewer):
    vcpu = await _query_prometheus('libvirt_domain_info_virtual_cpus')
    mem = await _query_prometheus('libvirt_domain_info_memory_usage_bytes')
    return {"vcpu": _extract_series(vcpu), "memory": _extract_series(mem)}


@router.get("/containers")
async def container_metrics(_=RequireViewer):
    cpu = await _query_prometheus('rate(container_cpu_usage_seconds_total{image!=""}[1m]) * 100')
    mem = await _query_prometheus('container_memory_usage_bytes{image!=""}')
    net_rx = await _query_prometheus('rate(container_network_receive_bytes_total{image!=""}[1m])')
    net_tx = await _query_prometheus('rate(container_network_transmit_bytes_total{image!=""}[1m])')
    return {
        "cpu": _extract_series(cpu),
        "memory": _extract_series(mem),
        "net_rx": _extract_series(net_rx),
        "net_tx": _extract_series(net_tx),
    }


@router.get("/gpu")
async def gpu_metrics(_=RequireViewer):
    util = await _query_prometheus('DCGM_FI_DEV_GPU_UTIL')
    mem = await _query_prometheus('DCGM_FI_DEV_MEM_COPY_UTIL')
    temp = await _query_prometheus('DCGM_FI_DEV_GPU_TEMP')
    return {
        "utilization": _extract_series(util),
        "memory": _extract_series(mem),
        "temperature": _extract_series(temp),
    }


@router.get("/query")
async def raw_query(
    q: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    step: str = "60s",
    _=RequireViewer,
):
    return await _query_prometheus(q, start, end, step)


def _extract_value(resp: dict) -> Optional[float]:
    try:
        return float(resp["data"]["result"][0]["value"][1])
    except (KeyError, IndexError, ValueError):
        return None


def _extract_series(resp: dict) -> list[dict]:
    result = []
    try:
        for item in resp["data"]["result"]:
            result.append({
                "labels": item.get("metric", {}),
                "value": float(item["value"][1]) if "value" in item else None,
                "values": item.get("values"),
            })
    except (KeyError, TypeError):
        pass
    return result
