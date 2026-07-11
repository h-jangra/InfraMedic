from sqlalchemy.orm import Session
from app.agents.base import AgentName
from app.models.incident import Incident
from app.schemas.incident import IncidentStepCreate
from app.services.incidents import create_incident_step


class KnowledgeAgent:
    name = AgentName.knowledge

    def run(self, db: Session, incident: Incident) -> str:
        service = incident.service_name
        metric = incident.metric_name

        if service == "checkout-api" and metric == "cpu_percent":
            message = (
                "Knowledge Base Search: Found 'SOP-023: High CPU in API Gateway'. Recommended remediations: "
                "1. Scale service replicas (horizontal scaling) to distribute traffic. "
                "2. Clear Redis cache or restart daemon. "
                "3. Enable rate limiting on cart endpoints."
            )
        elif service == "inventory-worker" and metric == "memory_percent":
            message = (
                "Knowledge Base Search: Found 'SOP-104: Worker Memory Exhaustion'. Recommended remediations: "
                "1. Restart the background worker service to reclaim leaked memory. "
                "2. Temporary vertical scaling if worker load is high. "
                "3. Revert to stable build version if memory grows linearly."
            )
        elif service == "payments-api" and metric == "error_rate_percent":
            message = (
                "Knowledge Base Search: Found 'SOP-009: Pod CrashLoopBackOff & Bad Config'. Recommended remediations: "
                "1. Rollback the deployment or configuration changes immediately. "
                "2. Verify database connection credentials."
            )
        elif service == "orders-api" and metric == "latency_ms":
            message = (
                "Knowledge Base Search: Found 'SOP-081: Canary Latency Spike'. Recommended remediations: "
                "1. Rollback the active deployment to stable release v2.0.8. "
                "2. Verify egress routes and security group rules."
            )
        elif service in ("db-storm", "database-storm"):
            message = (
                "Knowledge Base Search: Found 'SOP-221: Database Max Connections Reached'. Recommended remediations: "
                "1. Rollback database config deployment (revert DB_MAX_CONNECTIONS pool size to 200). "
                "2. Restart the database backend. "
                "3. Scale application replicas up if traffic surge warrants it."
            )
        else:
            message = (
                f"Knowledge Base Search: Found 'SOP-999: General Telemetry Anomaly'. Recommended remediations: "
                f"1. Monitor metrics for stabilization. "
                f"2. Restart service {service} if status is critical."
            )

        create_incident_step(
            db,
            IncidentStepCreate(
                incident_id=incident.id,
                agent=self.name.value,
                message=message,
                step_type="knowledge_retrieval",
            ),
        )
        return message


knowledge_agent = KnowledgeAgent()
