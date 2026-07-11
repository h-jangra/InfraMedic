from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.setting import SystemSetting


def get_setting_value(db: Session, key: str, default: str | None = None) -> str | None:
    db_setting = db.scalar(select(SystemSetting).where(SystemSetting.key == key))
    if db_setting is not None:
        return db_setting.value
    return default


def set_setting_value(db: Session, key: str, value: str) -> SystemSetting:
    db_setting = db.scalar(select(SystemSetting).where(SystemSetting.key == key))
    if db_setting is not None:
        db_setting.value = value
    else:
        db_setting = SystemSetting(key=key, value=value)
        db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting


def get_cloud_settings(db: Session) -> dict:
    settings = get_settings()
    aws_default_endpoint = settings.floci_endpoint_url or "http://localhost:4566"

    return {
        "aws_endpoint_url": get_setting_value(db, "aws_endpoint_url", aws_default_endpoint),
        "aws_region": get_setting_value(db, "aws_region", settings.floci_region or "us-east-1"),
        "aws_access_key_id": get_setting_value(db, "aws_access_key_id", settings.floci_access_key_id or "floci"),
        "aws_secret_access_key": get_setting_value(
            db, "aws_secret_access_key", settings.floci_secret_access_key or "floci"
        ),
        "aws_bucket_name": get_setting_value(db, "aws_bucket_name", settings.floci_bucket_name or "inframedic-artifacts"),

        "azure_endpoint_url": get_setting_value(db, "azure_endpoint_url", "http://localhost:10000"),
        "azure_account_name": get_setting_value(db, "azure_account_name", "devstoreaccount1"),
        "azure_account_key": get_setting_value(
            db, "azure_account_key", "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ5n941"
        ),
        "azure_container_name": get_setting_value(db, "azure_container_name", "inframedic-container"),

        "gcp_endpoint_url": get_setting_value(db, "gcp_endpoint_url", "http://localhost:4443"),
        "gcp_project_id": get_setting_value(db, "gcp_project_id", "floci-gcp-project"),
        "gcp_credentials_json": get_setting_value(db, "gcp_credentials_json", "{}"),
        "gcp_bucket_name": get_setting_value(db, "gcp_bucket_name", "inframedic-gcp-bucket"),
    }


def update_cloud_settings(db: Session, data: dict) -> dict:
    valid_keys = [
        "aws_endpoint_url",
        "aws_region",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_bucket_name",
        "azure_endpoint_url",
        "azure_account_name",
        "azure_account_key",
        "azure_container_name",
        "gcp_endpoint_url",
        "gcp_project_id",
        "gcp_credentials_json",
        "gcp_bucket_name",
    ]
    for key, val in data.items():
        if key in valid_keys:
            set_setting_value(db, key, val)
    return get_cloud_settings(db)
