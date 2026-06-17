import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import init_db
from src.routers import auth, users, vms, containers, storage, networks, firewall, gpu, cluster, monitoring, system, update
from src.auth.jwt import hash_password
from src.models.user import User, RoleEnum


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("/var/lib/debdox", exist_ok=True)
    await init_db()
    await _seed_admin()
    yield


async def _seed_admin():
    """Create the default admin user on first boot if no users exist."""
    from sqlalchemy import select, func
    from src.database import AsyncSessionLocal
    from src.models.user import User

    async with AsyncSessionLocal() as db:
        count = await db.execute(select(func.count()).select_from(User))
        if count.scalar() == 0:
            admin = User(
                username=settings.admin_username,
                hashed_password=hash_password(settings.admin_password),
                role=RoleEnum.admin,
                is_active=True,
            )
            db.add(admin)
            await db.commit()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vms.router)
app.include_router(containers.router)
app.include_router(storage.router)
app.include_router(networks.router)
app.include_router(firewall.router)
app.include_router(gpu.router)
app.include_router(cluster.router)
app.include_router(monitoring.router)
app.include_router(system.router)
app.include_router(update.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.version}
