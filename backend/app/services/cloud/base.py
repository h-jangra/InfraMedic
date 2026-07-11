from abc import ABC, abstractmethod


class CloudAdapter(ABC):
    """Base interface for all Cloud infrastructure providers (AWS/Floci, Azure, Stubs)."""

    @abstractmethod
    def discover_compute_instances(self, config: dict) -> list[dict]:
        """Discover EC2 instances, Azure VMs, or container hosts."""
        pass

    @abstractmethod
    def discover_storage(self, config: dict) -> list[dict]:
        """Discover S3 buckets, Azure blob containers, or GCP buckets."""
        pass

    @abstractmethod
    def discover_databases(self, config: dict) -> list[dict]:
        """Discover RDS databases or SQL database clusters."""
        pass

    @abstractmethod
    def discover_secrets(self, config: dict) -> list[dict]:
        """Discover secrets in Secrets Manager or Key Vaults."""
        pass

    @abstractmethod
    def discover_networking(self, config: dict) -> list[dict]:
        """Discover VPCs, Subnets, and Virtual Networks."""
        pass

    @abstractmethod
    def provision_demo_infrastructure(self, config: dict) -> bool:
        """Create mock/emulated resources on the target cloud provider for demo/evaluation."""
        pass

    @abstractmethod
    def teardown_infrastructure(self, config: dict) -> bool:
        """Destroy resources created for the demo."""
        pass
