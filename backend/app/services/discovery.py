import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from app.models.resource import CloudResource
from app.services.cloud import get_cloud_provider
from app.services.settings import get_cloud_settings

logger = logging.getLogger(__name__)


def discover_all_resources(db: Session, provider_name: str | None = None) -> dict:
    """Discovers resources from the cloud provider, syncs to DB cache, and returns them.
    Never fabricates resources. If the cloud provider is empty, returns empty results.
    """
    c_settings = get_cloud_settings(db)
    
    if not provider_name:
        # Determine provider from settings (default to floci)
        from app.models.setting import SystemSetting
        provider_name = "floci"

        # Check connection status in DB first
        aws_status = db.scalar(select(SystemSetting).where(SystemSetting.key == "provider_status_aws"))
        azure_status = db.scalar(select(SystemSetting).where(SystemSetting.key == "provider_status_azure"))
        gcp_status = db.scalar(select(SystemSetting).where(SystemSetting.key == "provider_status_gcp"))

        if aws_status and aws_status.value == "connected":
            provider_name = "aws"
        elif azure_status and azure_status.value == "connected":
            provider_name = "azure"
        elif gcp_status and gcp_status.value == "connected":
            provider_name = "gcp"
        else:
            # Fallback to endpoint detection
            aws_endpoint = c_settings.get("aws_endpoint_url", "")
            if aws_endpoint and not any(x in aws_endpoint.lower() for x in ["localhost", "127.0.0.1", "host.docker.internal", "4566"]):
                provider_name = "aws"
            elif c_settings.get("azure_subscription_id"):
                provider_name = "azure"
            elif c_settings.get("gcp_project_id") and c_settings.get("gcp_project_id") != "floci-gcp-project":
                provider_name = "gcp"

    provider = get_cloud_provider(provider_name)

    # 1. Query the cloud provider (source of truth)
    compute = provider.discover_compute(c_settings)
    storage = provider.discover_storage(c_settings)
    databases = provider.discover_databases(c_settings)
    networking = provider.discover_networks(c_settings)
    functions = provider.discover_functions(c_settings)
    secrets = provider.discover_secrets(c_settings)
    clusters = provider.discover_kubernetes(c_settings)
    load_balancers = provider.discover_load_balancers(c_settings)

    # 2. Sync to DB Cache (clear old and write newly discovered for this provider only)
    existing_resources = db.scalars(select(CloudResource)).all()
    for res in existing_resources:
        try:
            details = json.loads(res.details_json) if res.details_json else {}
            if details.get("discovery_provider") == provider_name:
                db.delete(res)
        except Exception:
            db.delete(res)
    db.commit()

    # Save compute
    for item in compute:
        item["discovery_provider"] = provider_name
        _save_resource(db, "compute", item["id"], item["name"], item["status"], item)
    # Save storage
    for item in storage:
        item["discovery_provider"] = provider_name
        _save_resource(db, "storage", item["name"], item["name"], item["status"], item)
    # Save databases
    for item in databases:
        item["discovery_provider"] = provider_name
        _save_resource(db, "database", item["id"], item["id"], item["status"], item)
    # Save networking
    for item in networking:
        item["discovery_provider"] = provider_name
        _save_resource(db, "networking", item["id"], item["name"], item["status"], item)
    # Save functions
    for item in functions:
        item["discovery_provider"] = provider_name
        _save_resource(db, "function", item["id"], item["name"], item["status"], item)
    # Save secrets
    for item in secrets:
        item["discovery_provider"] = provider_name
        _save_resource(db, "secret", item["name"], item["name"], item["status"], item)
    # Save clusters
    for item in clusters:
        item["discovery_provider"] = provider_name
        _save_resource(db, "cluster", item["id"], item["name"], item["status"], item)
    # Save load balancers
    for item in load_balancers:
        item["discovery_provider"] = provider_name
        _save_resource(db, "load_balancer", item["id"], item["name"], item["status"], item)

    db.commit()

    return {
        "compute": compute,
        "storage": storage,
        "databases": databases,
        "networking": networking,
        "functions": functions,
        "secrets": secrets,
        "clusters": clusters,
        "load_balancers": load_balancers
    }


def get_cached_resources(db: Session) -> dict:
    """Returns the cached resources from the database, grouped by resource_type."""
    resources = {
        "compute": [],
        "storage": [],
        "databases": [],
        "networking": [],
        "functions": [],
        "secrets": [],
        "clusters": [],
        "load_balancers": []
    }

    db_resources = db.scalars(select(CloudResource)).all()
    for res in db_resources:
        try:
            details = json.loads(res.details_json) if res.details_json else {}
            res_type = res.resource_type
            if res_type in resources:
                resources[res_type].append(details)
        except Exception:
            pass

    return resources


def provision_demo_infrastructure_and_persist(db: Session) -> bool:
    """Provisions mock demo infrastructure (VPCs, instances, databases, secrets)
    directly into the local development cloud provider (Floci/LocalStack) using AWS APIs.
    """
    c_settings = get_cloud_settings(db)
    provider = get_cloud_provider("floci")

    # Deploys real resources inside LocalStack
    return provider.provision_demo_infrastructure(c_settings)


def teardown_infrastructure_and_persist(db: Session) -> bool:
    """Tears down all provisioned infrastructure from the cloud provider."""
    c_settings = get_cloud_settings(db)
    provider = get_cloud_provider("floci")

    # Deletes real resources inside LocalStack
    success = provider.teardown_infrastructure(c_settings)

    # Clear DB cache
    db.execute(delete(CloudResource))
    db.commit()
    return success


def _save_resource(db: Session, res_type: str, res_id: str, name: str, status: str, details: dict):
    res = CloudResource(
        resource_type=res_type,
        resource_id=res_id,
        name=name,
        status=status,
        details_json=json.dumps(details)
    )
    db.add(res)
