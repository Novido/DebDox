import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    operator = "operator"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(256), unique=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    role: Mapped[RoleEnum] = mapped_column(SAEnum(RoleEnum), default=RoleEnum.viewer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    group_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("groups.id"), nullable=True)
    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="users")
    api_keys: Mapped[list["APIKey"]] = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    layout: Mapped[Optional["UserLayout"]] = relationship("UserLayout", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(64), unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[RoleEnum] = mapped_column(SAEnum(RoleEnum), default=RoleEnum.viewer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship("User", back_populates="group")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(64), unique=True)
    permissions: Mapped[str] = mapped_column(Text, default="[]")


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128))
    key_hash: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    user: Mapped["User"] = relationship("User", back_populates="api_keys")


class UserLayout(Base):
    """Stores the dashboard widget layout per user (react-grid-layout JSON)."""
    __tablename__ = "user_layouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True)
    layout_json: Mapped[str] = mapped_column(Text, default="[]")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="layout")
