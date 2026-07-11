from abc import ABC, abstractmethod


class CloudProvider(ABC):
    """Abstract base cloud provider interface defining multi-cloud operational methods."""

    @abstractmethod
    def connect(self, config: dict) -> bool:
        """Establish connection credentials validation. Return True if successful."""
        pass

    @abstractmethod
    def health(self, config: dict) -> dict:
        """Verify endpoint connectivity and return account, region, auth method, and health status."""
        pass

    @abstractmethod
    def discover_compute(self, config: dict) -> list[dict]:
        """Discover compute instances, VMs, or container tasks."""
        pass

    @abstractmethod
    def discover_storage(self, config: dict) -> list[dict]:
        """Discover object storage buckets or blob storage containers."""
        pass

    @abstractmethod
    def discover_databases(self, config: dict) -> list[dict]:
        """Discover database instances, SQL databases, or cache clusters."""
        pass

    @abstractmethod
    def discover_networks(self, config: dict) -> list[dict]:
        """Discover virtual network VPCs, subnets, and security groups."""
        pass

    @abstractmethod
    def discover_kubernetes(self, config: dict) -> list[dict]:
        """Discover managed Kubernetes clusters (EKS, AKS, GKE)."""
        pass

    @abstractmethod
    def discover_functions(self, config: dict) -> list[dict]:
        """Discover serverless functions (Lambda, GCP Functions, Azure App Functions)."""
        pass

    @abstractmethod
    def discover_load_balancers(self, config: dict) -> list[dict]:
        """Discover application or network load balancers."""
        pass

    @abstractmethod
    def discover_secrets(self, config: dict) -> list[dict]:
        """Discover secrets vaults keys or parameter stores."""
        pass

    @abstractmethod
    def discover_identity(self, config: dict) -> list[dict]:
        """Discover identity groups, roles, and profiles."""
        pass

    @abstractmethod
    def collect_metrics(self, config: dict) -> list[dict]:
        """Collect raw performance metric snapshots for all resources."""
        pass

    @abstractmethod
    def collect_logs(self, config: dict) -> list[dict]:
        """Query log streams or log events."""
        pass

    @abstractmethod
    def list_incidents(self, config: dict) -> list[dict]:
        """Expose list of platform events or alerts detected by the provider monitoring."""
        pass

    @abstractmethod
    def execute_action(self, config: dict, action: str, resource_id: str) -> dict:
        """Execute a remediation action (e.g. RestartInstance, ScaleUp)."""
        pass

    def provision_demo_infrastructure(self, config: dict) -> bool:
        """Optional helper to deploy sandbox components in development/test providers."""
        return False

    def teardown_infrastructure(self, config: dict) -> bool:
        """Optional helper to destroy deployed sandbox components."""
        return False
