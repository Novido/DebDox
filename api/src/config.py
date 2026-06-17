from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="/etc/debdox/api.env", extra="ignore")

    app_name: str = "DebDox API"
    version: str = "1.0.0"

    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Initial admin account, seeded on first boot from /etc/debdox/api.env.
    # Read via pydantic so seeding works regardless of the service's
    # EnvironmentFile being loaded.
    admin_username: str = Field(default="admin", validation_alias="DEBDOX_ADMIN_USERNAME")
    admin_password: str = Field(default="DebDox!Change", validation_alias="DEBDOX_ADMIN_PASSWORD")

    db_url: str = "sqlite+aiosqlite:////var/lib/debdox/debdox.db"

    # Libvirt connection URI
    libvirt_uri: str = "qemu:///system"

    # Docker socket
    docker_socket: str = "unix:///var/run/docker.sock"

    # Prometheus
    prometheus_url: str = "http://localhost:9090"

    # Cluster
    master_url: str = ""
    node_name: str = "master"
    cluster_secret: str = "change-me-cluster-secret"

    # MCP
    mcp_host: str = "127.0.0.1"
    mcp_port: int = 8765


settings = Settings()
