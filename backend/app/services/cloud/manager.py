import logging
from app.services.cloud.provider import CloudProvider
from app.services.cloud.aws import AWSProvider
from app.services.cloud.azure import AzureProvider
from app.services.cloud.gcp import GCPProvider
from app.services.cloud.floci import FlociProvider

logger = logging.getLogger(__name__)


def get_cloud_provider(provider: str = "floci") -> CloudProvider:
    """Returns the requested cloud provider interface instance."""
    prov_lower = provider.strip().lower()
    
    if prov_lower == "aws":
        return AWSProvider()
    elif prov_lower == "azure":
        return AzureProvider()
    elif prov_lower == "gcp":
        return GCPProvider()
    else:
        # Default to local dev cloud (Floci/LocalStack)
        return FlociProvider()
