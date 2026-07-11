from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "InfraMedic"
    environment: str = "local"
    api_prefix: str = "/api"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://localhost:4173"])

    database_url: str = "postgresql+psycopg://inframedic:inframedic@postgres:5432/inframedic"
    redis_url: str = "redis://redis:6379/0"

    floci_endpoint_url: str | None = None
    floci_region: str = "us-east-1"
    floci_access_key_id: str = "floci"
    floci_secret_access_key: str = "floci"
    floci_bucket_name: str = "inframedic-artifacts"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
