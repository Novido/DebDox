from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.auth.rbac import RequireAdmin, RequireViewer
from src.services import nftables_service

router = APIRouter(prefix="/api/firewall", tags=["firewall"])


class RuleAdd(BaseModel):
    table: str = "filter"
    chain: str = "INPUT"
    rule_expr: str
    family: str = "ip"


class RuleDelete(BaseModel):
    table: str
    chain: str
    handle: int
    family: str = "ip"


class ChainCreate(BaseModel):
    table: str
    chain: str
    type_: str = "filter"
    hook: str = "input"
    priority: int = 0
    policy: str = "accept"
    family: str = "ip"


@router.get("/ruleset")
async def get_ruleset(_=RequireViewer):
    return await nftables_service.get_ruleset()


@router.get("/rules")
async def list_rules(table: str = "filter", chain: str = "INPUT", _=RequireViewer):
    return await nftables_service.list_rules(table, chain)


@router.post("/rules", status_code=201)
async def add_rule(body: RuleAdd, _=RequireAdmin):
    return await nftables_service.add_rule(body.table, body.chain, body.rule_expr, body.family)


@router.delete("/rules")
async def delete_rule(body: RuleDelete, _=RequireAdmin):
    await nftables_service.delete_rule(body.table, body.chain, body.handle, body.family)
    return {"status": "deleted"}


@router.post("/chains", status_code=201)
async def create_chain(body: ChainCreate, _=RequireAdmin):
    return await nftables_service.add_chain(
        body.table, body.chain, body.type_, body.hook, body.priority, body.policy, body.family
    )


@router.delete("/chains/{table}/{chain}")
async def flush_chain(table: str, chain: str, family: str = "ip", _=RequireAdmin):
    await nftables_service.flush_chain(table, chain, family)
    return {"status": "flushed"}


@router.get("/tables")
async def list_tables(family: str = "ip", _=RequireViewer):
    return await nftables_service.list_tables(family)


@router.put("/ruleset")
async def apply_ruleset(body: dict, _=RequireAdmin):
    import json
    await nftables_service.apply_ruleset(json.dumps(body))
    return {"status": "applied"}
