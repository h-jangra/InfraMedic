from app.services.cloud.aws import AWSProvider


class FlociProvider(AWSProvider):
    """Local Development Cloud Provider (Floci) wrapping LocalStack AWS emulators."""

    def health(self, config: dict) -> dict:
        info = super().health(config)
        info["auth_method"] = "Local Developer (Floci)"
        info["account"] = "000000000000"
        info["project"] = "localstack-sandbox"
        info["region"] = config.get("aws_region", "us-east-1")
        if info["status"] == "connected":
            info["health"] = "Healthy (LocalStack Active)"
        return info
