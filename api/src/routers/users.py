import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.jwt import hash_password, pwd_context
from src.auth.rbac import RequireAdmin, CurrentUser, get_current_user
from src.database import get_db
from src.models.user import User, Group, APIKey, RoleEnum, UserLayout

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: RoleEnum = RoleEnum.viewer
    group_id: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None
    group_id: Optional[str] = None


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    role: RoleEnum = RoleEnum.viewer


class APIKeyCreate(BaseModel):
    name: str
    expires_days: Optional[int] = None


# --- Users ---

@router.get("/")
async def list_users(db: AsyncSession = Depends(get_db), _=RequireAdmin):
    result = await db.execute(select(User))
    return [{"id": u.id, "username": u.username, "role": u.role, "is_active": u.is_active} for u in result.scalars()]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), _=RequireAdmin):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(
        username=body.username,
        hashed_password=hash_password(body.password),
        email=body.email,
        role=body.role,
        group_id=body.group_id,
    )
    db.add(user)
    await db.commit()
    return {"id": user.id, "username": user.username}


@router.put("/{user_id}")
async def update_user(user_id: str, body: UserUpdate, db: AsyncSession = Depends(get_db), _=RequireAdmin):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    await db.commit()
    return {"id": user.id, "username": user.username}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db), _=RequireAdmin):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


# --- Groups ---

@router.get("/groups/")
async def list_groups(db: AsyncSession = Depends(get_db), _=RequireAdmin):
    result = await db.execute(select(Group))
    return [{"id": g.id, "name": g.name, "role": g.role} for g in result.scalars()]


@router.post("/groups/", status_code=status.HTTP_201_CREATED)
async def create_group(body: GroupCreate, db: AsyncSession = Depends(get_db), _=RequireAdmin):
    group = Group(name=body.name, description=body.description, role=body.role)
    db.add(group)
    await db.commit()
    return {"id": group.id, "name": group.name}


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: str, db: AsyncSession = Depends(get_db), _=RequireAdmin):
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    await db.delete(group)
    await db.commit()


# --- API Keys ---

@router.get("/apikeys/")
async def list_api_keys(current_user: User = CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APIKey).where(APIKey.user_id == current_user.id))
    return [{"id": k.id, "name": k.name, "created_at": k.created_at, "expires_at": k.expires_at} for k in result.scalars()]


@router.post("/apikeys/", status_code=status.HTTP_201_CREATED)
async def create_api_key(body: APIKeyCreate, current_user: User = CurrentUser, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta, datetime, timezone
    raw_key = f"ddx_{secrets.token_urlsafe(32)}"
    expires = None
    if body.expires_days:
        expires = datetime.now(timezone.utc) + timedelta(days=body.expires_days)
    key = APIKey(
        name=body.name,
        key_hash=pwd_context.hash(raw_key),
        user_id=current_user.id,
        expires_at=expires,
    )
    db.add(key)
    await db.commit()
    return {"id": key.id, "name": key.name, "key": raw_key}


@router.delete("/apikeys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(key_id: str, current_user: User = CurrentUser, db: AsyncSession = Depends(get_db)):
    key = await db.get(APIKey, key_id)
    if not key or key.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="API key not found")
    await db.delete(key)
    await db.commit()


# --- Dashboard Layout ---

@router.get("/layout/")
async def get_layout(current_user: User = CurrentUser, db: AsyncSession = Depends(get_db)):
    layout = await db.get(UserLayout, current_user.id)
    return {"layout": layout.layout_json if layout else "[]"}


@router.put("/layout/")
async def save_layout(body: dict, current_user: User = CurrentUser, db: AsyncSession = Depends(get_db)):
    import json
    layout = await db.execute(select(UserLayout).where(UserLayout.user_id == current_user.id))
    row = layout.scalar_one_or_none()
    if row:
        row.layout_json = json.dumps(body.get("layout", []))
    else:
        db.add(UserLayout(user_id=current_user.id, layout_json=json.dumps(body.get("layout", []))))
    await db.commit()
    return {"status": "saved"}
