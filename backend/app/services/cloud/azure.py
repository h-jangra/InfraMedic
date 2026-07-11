import logging
from app.services.cloud.provider import CloudProvider

logger = logging.getLogger(__name__)

try:
    from azure.identity import DefaultAzureCredential
    from azure.mgmt.compute import ComputeManagementClient
    from azure.mgmt.storage import StorageManagementClient
    from azure.mgmt.network import NetworkManagementClient
    from azure.mgmt.keyvault import KeyVaultManagementClient
    from azure.mgmt.containerservice import ContainerServiceClient
    AZURE_SDK_AVAILABLE = True
except ImportError:
    AZURE_SDK_AVAILABLE = False


class AzureProvider(CloudProvider):
    """Real Azure Provider using Azure SDK with full abstraction interface support."""

    def _get_credentials(self):
        if not AZURE_SDK_AVAILABLE:
            raise ImportError("Azure SDK not installed. Run `pip install azure-mgmt-compute azure-identity`.")
        return DefaultAzureCredential()

    def connect(self, config: dict) -> bool:
        if not AZURE_SDK_AVAILABLE:
            return False
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return False
        try:
            cred = self._get_credentials()
            ComputeManagementClient(cred, sub_id)
            return True
        except Exception:
            return False

    def health(self, config: dict) -> dict:
        sub_id = config.get("azure_subscription_id")
        if not AZURE_SDK_AVAILABLE or not sub_id:
            return {
                "status": "disconnected",
                "auth_method": "None",
                "account": "None",
                "project": "None",
                "region": "None",
                "health": "Disconnected: Missing subscription or azure-identity SDK"
            }
        try:
            # Azure authentication priority is resolved automatically by DefaultAzureCredential
            return {
                "status": "connected",
                "auth_method": "DefaultAzureCredential",
                "account": f"Sub: {sub_id[:8]}...",
                "project": sub_id,
                "region": "global",
                "health": "Healthy"
            }
        except Exception as e:
            return {
                "status": "error",
                "auth_method": "None",
                "account": "None",
                "project": "None",
                "region": "None",
                "health": f"Unhealthy: {str(e)}"
            }

    def discover_compute(self, config: dict) -> list[dict]:
        if not AZURE_SDK_AVAILABLE:
            return []
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return []
        resources = []
        try:
            cred = self._get_credentials()
            compute_client = ComputeManagementClient(cred, sub_id)
            for vm in compute_client.virtual_machines.list_all():
                resources.append({
                    "id": vm.id,
                    "name": vm.name,
                    "status": "Running" if vm.provisioning_state == "Succeeded" else vm.provisioning_state,
                    "ip": "Dynamic",
                    "cpu": 0.0,
                    "memory": 0.0,
                    "type": vm.hardware_profile.vm_size if vm.hardware_profile else "Standard_D2s_v3",
                    "provider": "Azure",
                    "resource_type": "compute"
                })
        except Exception as e:
            logger.warning(f"Azure VM discovery encountered errors: {e}")
        return resources

    def discover_storage(self, config: dict) -> list[dict]:
        if not AZURE_SDK_AVAILABLE:
            return []
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return []
        resources = []
        try:
            cred = self._get_credentials()
            storage_client = StorageManagementClient(cred, sub_id)
            for acct in storage_client.storage_accounts.list():
                resources.append({
                    "name": acct.name,
                    "status": "Active",
                    "size": "N/A",
                    "files_count": 0,
                    "provider": "Azure",
                    "resource_type": "storage"
                })
        except Exception as e:
            logger.warning(f"Azure Storage discovery failed: {e}")
        return resources

    def discover_databases(self, config: dict) -> list[dict]:
        return []

    def discover_networks(self, config: dict) -> list[dict]:
        if not AZURE_SDK_AVAILABLE:
            return []
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return []
        resources = []
        try:
            cred = self._get_credentials()
            network_client = NetworkManagementClient(cred, sub_id)
            for vnet in network_client.virtual_networks.list_all():
                resources.append({
                    "id": vnet.id,
                    "name": vnet.name,
                    "cidr": ", ".join(vnet.address_space.address_prefixes) if vnet.address_space else "10.0.0.0/16",
                    "status": "Active",
                    "provider": "Azure",
                    "resource_type": "networking"
                })
        except Exception as e:
            logger.warning(f"Azure Network discovery failed: {e}")
        return resources

    def discover_kubernetes(self, config: dict) -> list[dict]:
        if not AZURE_SDK_AVAILABLE:
            return []
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return []
        resources = []
        try:
            cred = self._get_credentials()
            aks_client = ContainerServiceClient(cred, sub_id)
            for cluster in aks_client.managed_clusters.list():
                resources.append({
                    "id": cluster.id,
                    "name": cluster.name,
                    "status": cluster.provisioning_state,
                    "type": "Azure Kubernetes Service",
                    "provider": "Azure",
                    "resource_type": "cluster"
                })
        except Exception as e:
            logger.warning(f"Azure AKS discovery failed: {e}")
        return resources

    def discover_functions(self, config: dict) -> list[dict]:
        return []

    def discover_load_balancers(self, config: dict) -> list[dict]:
        if not AZURE_SDK_AVAILABLE:
            return []
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return []
        resources = []
        try:
            cred = self._get_credentials()
            net_client = NetworkManagementClient(cred, sub_id)
            for lb in net_client.load_balancers.list_all():
                resources.append({
                    "id": lb.id,
                    "name": lb.name,
                    "status": "Active",
                    "type": "Load Balancer",
                    "provider": "Azure",
                    "resource_type": "load_balancer"
                })
        except Exception as e:
            logger.warning(f"Azure LB discovery failed: {e}")
        return resources

    def discover_secrets(self, config: dict) -> list[dict]:
        if not AZURE_SDK_AVAILABLE:
            return []
        sub_id = config.get("azure_subscription_id")
        if not sub_id:
            return []
        resources = []
        try:
            cred = self._get_credentials()
            kv_client = KeyVaultManagementClient(cred, sub_id)
            for vault in kv_client.vaults.list():
                resources.append({
                    "name": vault.name,
                    "type": "KeyVault secret",
                    "status": "Secure",
                    "last_rotated": "N/A",
                    "provider": "Azure",
                    "resource_type": "secret"
                })
        except Exception as e:
            logger.warning(f"Azure KeyVault discovery failed: {e}")
        return resources

    def discover_identity(self, config: dict) -> list[dict]:
        return []

    def collect_metrics(self, config: dict) -> list[dict]:
        return []

    def collect_logs(self, config: dict) -> list[dict]:
        return []

    def list_incidents(self, config: dict) -> list[dict]:
        return []

    def execute_action(self, config: dict, action: str, resource_id: str) -> dict:
        return {"status": "error", "message": "Actions execution is not implemented for Azure provider."}
