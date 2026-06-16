import docker


def collect() -> list[dict]:
    try:
        c = docker.from_env()
        containers = []
        for ct in c.containers.list(all=True):
            containers.append({
                "id": ct.id[:12],
                "name": ct.name,
                "status": ct.status,
                "image": ct.image.tags[0] if ct.image.tags else ct.image.short_id,
            })
        return containers
    except Exception:
        return []
