"""nftables firewall management via nft CLI."""
import asyncio
import json


async def _run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
    return stdout.decode().strip()


async def get_ruleset() -> dict:
    out = await _run("nft", "-j", "list", "ruleset")
    return json.loads(out)


async def list_rules(table: str = "filter", chain: str = "INPUT") -> list[dict]:
    out = await _run("nft", "-j", "list", "chain", "ip", table, chain)
    data = json.loads(out)
    rules = []
    for item in data.get("nftables", []):
        if "rule" in item:
            rules.append(item["rule"])
    return rules


async def add_rule(
    table: str,
    chain: str,
    rule_expr: str,
    family: str = "ip",
) -> dict:
    await _run("nft", "add", "rule", family, table, chain, rule_expr)
    return {"status": "added", "table": table, "chain": chain, "rule": rule_expr}


async def delete_rule(table: str, chain: str, handle: int, family: str = "ip") -> None:
    await _run("nft", "delete", "rule", family, table, chain, "handle", str(handle))


async def add_chain(table: str, chain: str, type_: str, hook: str, priority: int = 0, policy: str = "accept", family: str = "ip") -> dict:
    await _run("nft", "add", "chain", family, table, chain,
               "{", f"type {type_} hook {hook} priority {priority}; policy {policy};", "}")
    return {"status": "created", "chain": chain}


async def flush_chain(table: str, chain: str, family: str = "ip") -> None:
    await _run("nft", "flush", "chain", family, table, chain)


async def list_tables(family: str = "ip") -> list[str]:
    out = await _run("nft", "list", "tables", family)
    return [line.split()[-1] for line in out.splitlines() if line.startswith(f"table {family}")]


async def apply_ruleset(ruleset_json: str) -> None:
    """Apply a complete JSON ruleset (replace current)."""
    proc = await asyncio.create_subprocess_exec(
        "nft", "-j", "-f", "-",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate(ruleset_json.encode())
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip())
