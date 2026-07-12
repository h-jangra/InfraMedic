from sqlalchemy.orm import Session
from app.agents.base import AgentName
from app.models.incident import Incident
from app.schemas.incident import IncidentStepCreate
from app.services.incidents import create_incident_step


class RemediationAgent:
    name = AgentName.remediation

    def run(self, db: Session, incident: Incident) -> tuple[str, str]:
        service = incident.service_name
        metric = incident.metric_name

        if service == "checkout-api" and metric == "cpu_percent":
            action = "Scale Deployment"
            message = (
                "Remediation Execution: Action selected: 'Scale Deployment'. "
                "Issued command to Kubernetes API: 'kubectl scale deployment checkout-api --replicas=4'. "
                "Scaling target updated from 2 to 4 pods to distribute incoming traffic load."
            )
        elif service == "inventory-worker" and metric == "memory_percent":
            action = "Restart Service"
            message = (
                "Remediation Execution: Action selected: 'Restart Service'. "
                "Issued command to systemd runtime: 'systemctl restart inventory-worker'. "
                "Process restarted successfully, reclaiming old-generation heap storage and freeing memory."
            )
        elif service == "payments-api" and metric == "error_rate_percent":
            action = "Rollback Deployment"
            message = (
                "Remediation Execution: Action selected: 'Rollback Deployment'. "
                "Issued command to deployment engine: 'kubectl rollout undo deployment/payments-api'. "
                "Configuration database credentials rolled back to stable revision v1.8.3."
            )
        elif service == "orders-api" and metric == "latency_ms":
            action = "Rollback Deployment"
            message = (
                "Remediation Execution: Action selected: 'Rollback Deployment'. "
                "Issued command to helm charts: 'helm rollback orders-api'. "
                "Rolled back from release v2.1.0-rc1 to last stable deployment v2.0.8, removing bad network route values."
            )
        elif service in ("db-storm", "database-storm"):
            action = "Rollback Deployment"
            message = (
                "Remediation Execution: Action selected: 'Rollback Deployment'. "
                "Issued command to deployment engine: 'kubectl rollout undo deployment/postgres-db'. "
                "Reverted DB max connections pool setting to the standard 200, resolving connection limit constraints."
            )
        else:
            action = "Restart Pod"
            message = (
                f"Remediation Execution: Action selected: 'Restart Pod'. "
                f"Issued command to Kubernetes: 'kubectl rollout restart deployment/{service}'. "
                f"Restarted pod replicas for service {service}."
            )

        # Try to execute remediation on the real host if it's a real cloud instance
        from app.models.resource import CloudResource
        from sqlalchemy import select
        import json
        import logging

        logger = logging.getLogger(__name__)

        resource = db.scalar(
            select(CloudResource).where(
                (CloudResource.name == service) | (CloudResource.resource_id == service)
            )
        )
        if resource:
            try:
                details = json.loads(resource.details_json) if resource.details_json else {}
                ip = details.get("ip")
                instance_id = details.get("id") or resource.resource_id
                provider_name = details.get("discovery_provider") or details.get("provider", "")

                if provider_name.lower() in ("aws", "azure", "gcp"):
                    action = "Stop Stress Activity"
                    from app.services.settings import get_cloud_settings
                    config = get_cloud_settings(db)

                    from app.services.cloud.metrics import execute_remediation_on_host
                    success = execute_remediation_on_host(ip, instance_id, provider_name, config)
                    if success:
                        message = (
                            f"Remediation Execution: Action selected: '{action}'. "
                            f"Successfully connected to host {ip} ({instance_id}) "
                            f"and terminated CPU/Memory stress tools (stress, stress-ng, yes)."
                        )
                    else:
                        message = (
                            f"Remediation Execution: Action selected: '{action}'. "
                            f"Failed to connect to host {ip} ({instance_id}) via SSH/SSM. "
                            f"Please check credentials or SSH keys."
                        )
            except Exception as e:
                logger.warning(f"Failed to execute real host remediation for {service}: {e}")

        create_incident_step(
            db,
            IncidentStepCreate(
                incident_id=incident.id,
                agent=self.name.value,
                message=message,
                step_type="remediation",
            ),
        )
        return action, message


remediation_agent = RemediationAgent()
