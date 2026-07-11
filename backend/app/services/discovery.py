import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from app.models.resource import CloudResource
from app.services.cloud import get_cloud_provider
from app.services.settings import get_cloud_settings

logger = logging.getLogger(__name__)


def discover_all_resources(db: Session) -> dict:
    """Discovers resources from the cloud provider, syncs to DB cache, and returns them.
    Never fabricates resources. If the cloud provider is empty, returns empty results.
    """
    c_settings = get_cloud_settings(db)
    
    # Determine provider from settings (default to floci)
    provider_name = "floci"
    # If endpoint url is set but is not localhost:4566, or if region is custom, check
    aws_endpoint = c_settings.get("aws_endpoint_url", "")
    if aws_endpoint and "localhost" not in aws_endpoint and "127.0.0.1" not in aws_endpoint:
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
    clusters = provider.discover_clusters(c_settings)
    load_balancers = provider.discover_load_balancers(c_settings)

    # 2. Sync to DB Cache (clear old and write newly discovered)
    db.execute(delete(CloudResource))
    db.commit()

    # Save compute
    for item in compute:
        _save_resource(db, "compute", item["id"], item["name"], item["status"], item)
    # Save storage
    for item in storage:
        _save_resource(db, "storage", item["name"], item["name"], item["status"], item)
    # Save databases
    for item in databases:
        _save_resource(db, "database", item["id"], item["id"], item["status"], item)
    # Save networking
    for item in networking:
        _save_resource(db, "networking", item["id"], item["name"], item["status"], item)
    # Save functions
    for item in functions:
        _save_resource(db, "function", item["id"], item["name"], item["status"], item)
    # Save secrets
    for item in secrets:
        _save_resource(db, "secret", item["name"], item["name"], item["status"], item)
    # Save clusters
    for item in clusters:
        _save_resource(db, "cluster", item["id"], item["name"], item["status"], item)
    # Save load balancers
    for item in load_balancers:
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
