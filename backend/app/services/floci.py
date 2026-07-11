from typing import Any
import boto3


class FlociStorage:
    """S3-compatible storage adapter for cloud storage (defaults to local emulator)."""

    @property
    def _client(self) -> Any:
        from app.db.session import SessionLocal
        from app.services.settings import get_cloud_settings

        with SessionLocal() as db:
            c_settings = get_cloud_settings(db)

        endpoint_url = c_settings.get("aws_endpoint_url")
        if not endpoint_url or endpoint_url.strip().lower() in ("none", ""):
            endpoint_url = None

        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=c_settings.get("aws_region", "us-east-1"),
            aws_access_key_id=c_settings.get("aws_access_key_id", "floci"),
            aws_secret_access_key=c_settings.get("aws_secret_access_key", "floci"),
        )

    def put_text_artifact(self, key: str, body: str) -> None:
        from app.db.session import SessionLocal
        from app.services.settings import get_setting_value

        with SessionLocal() as db:
            bucket_name = get_setting_value(db, "aws_bucket_name", "inframedic-artifacts")

        self._client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=body.encode("utf-8"),
            ContentType="text/plain; charset=utf-8",
        )


floci_storage = FlociStorage()
