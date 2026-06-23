import json
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings


class CacheService:
    def __init__(self) -> None:
        self._client = redis.from_url(get_settings().redis_url, decode_responses=True)

    async def get_json(self, key: str) -> Any | None:
        value = await self._client.get(key)
        if value is None:
            return None
        return json.loads(value)

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        await self._client.set(key, json.dumps(value, default=str), ex=ttl_seconds)

    async def close(self) -> None:
        await self._client.aclose()


cache_service = CacheService()
