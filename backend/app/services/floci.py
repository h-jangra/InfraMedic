from functools import cached_property
from typing import Any

import boto3

from app.core.config import get_settings


class FlociStorage:
    """S3-compatible storage adapter for Floci local cloud."""

    @cached_property
    def _client(self) -> Any:
        settings = get_settings()
        return boto3.client(
            "s3",
            endpoint_url=settings.floci_endpoint_url,
            region_name=settings.floci_region,
            aws_access_key_id=settings.floci_access_key_id,
            aws_secret_access_key=settings.floci_secret_access_key,
        )

    def put_text_artifact(self, key: str, body: str) -> None:
        settings = get_settings()
        self._client.put_object(
            Bucket=settings.floci_bucket_name,
            Key=key,
            Body=body.encode("utf-8"),
            ContentType="text/plain; charset=utf-8",
        )


floci_storage = FlociStorage()
