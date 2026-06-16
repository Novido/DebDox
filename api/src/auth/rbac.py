from functools import wraps
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.jwt import decode_token, verify_password
from src.database import get_db
from src.models.user import User, APIKey, RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    api_key: Annotated[str | None, Security(api_key_header)],
    db: AsyncSession = Depends(get_db),
) -> User:
    if api_key:
        from src.auth.jwt import pwd_context
        result = await db.execute(select(APIKey).where(APIKey.is_active == True))
        for row in result.scalars():
            if pwd_context.verify(api_key, row.key_hash):
                user = await db.get(User, row.user_id)
                if user and user.is_active:
                    return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.username == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: RoleEnum):
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted for this action",
            )
        return current_user
    return dependency


RequireAdmin = Depends(require_role(RoleEnum.admin))
RequireOperator = Depends(require_role(RoleEnum.admin, RoleEnum.operator))
RequireViewer = Depends(require_role(RoleEnum.admin, RoleEnum.operator, RoleEnum.viewer))
CurrentUser = Depends(get_current_user)
