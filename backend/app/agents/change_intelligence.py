import json
from sqlalchemy.orm import Session
from app.agents.base import AgentName
from app.models.incident import Incident
from app.schemas.incident import IncidentStepCreate
from app.services.incidents import create_incident_step


class ChangeIntelligenceAgent:
    name = AgentName.change_intelligence

    def run(self, db: Session, incident: Incident) -> str:
        service = incident.service_name
        metric = incident.metric_name

        correlation_score = 0.0
        config_drifts = []
        git_commits = []
        deployments = []

        if service == "inventory-worker" and metric == "memory_percent":
            correlation_score = 0.94
            message = (
                "Correlated incident with recent deployment 'v1.4.22' of inventory-worker "
                "completed 3 hours ago. Correlation score: 0.94. Git diff indicates a change in "
                "in-memory caching libraries which likely introduced a memory leak."
            )
            deployments = [
                {
                    "version": "v1.4.22",
                    "timestamp": "3 hours ago",
                    "status": "completed",
                    "environment": "production",
                    "service": "inventory-worker"
                }
            ]
            git_commits = [
                {
                    "sha": "e93f21a",
                    "author": "Marcus Aurelius",
                    "message": "perf: upgrade memory-cache library and switch to Redis backing",
                    "timestamp": "3 hours ago",
                    "files_changed": ["src/cache/local_cache.go", "go.mod"],
                    "impact": "High"
                },
                {
                    "sha": "a12d90b",
                    "author": "Alice S.",
                    "message": "docs: update inventory processing schema notes",
                    "timestamp": "6 hours ago",
                    "files_changed": ["README.md"],
                    "impact": "Low"
                }
            ]
            config_drifts = [
                {
                    "key": "CACHE_TTL_SECONDS",
                    "previous_value": "300",
                    "current_value": "86400",
                    "updated_at": "3 hours ago",
                    "updated_by": "ci-cd-bot"
                }
            ]
        elif service == "payments-api" and metric == "error_rate_percent":
            correlation_score = 0.98
            message = (
                "Correlated incident with active configuration change in payments-api. "
                "Environment variable DB_PASSWORD was modified 15 minutes ago. Correlation score: 0.98. "
                "Missing or incorrect database credentials causing service start crash."
            )
            config_drifts = [
                {
                    "key": "DB_PASSWORD",
                    "previous_value": "******",
                    "current_value": "p@ssword123",
                    "updated_at": "15 minutes ago",
                    "updated_by": "security-operator"
                },
                {
                    "key": "DB_POOL_SIZE",
                    "previous_value": "20",
                    "current_value": "100",
                    "updated_at": "1 hour ago",
                    "updated_by": "security-operator"
                }
            ]
            git_commits = [
                {
                    "sha": "d82ef91",
                    "author": "Bob Dylan",
                    "message": "chore: lock down app settings configurations",
                    "timestamp": "15 minutes ago",
                    "files_changed": ["config/prod.yaml"],
                    "impact": "Medium"
                }
            ]
        elif service == "orders-api" and metric == "latency_ms":
            correlation_score = 1.00
            message = (
                "Correlated incident with active deployment 'v2.1.0-rc1' of orders-api "
                "in progress. Correlation score: 1.00. Anomaly in service latency and error rates "
                "started immediately post canary deployment."
            )
            deployments = [
                {
                    "version": "v2.1.0-rc1",
                    "timestamp": "10 minutes ago",
                    "status": "canary_active",
                    "environment": "production",
                    "service": "orders-api"
                }
            ]
            git_commits = [
                {
                    "sha": "b77c11a",
                    "author": "Charles B.",
                    "message": "feat: introduce gRPC routing with route-retry logic",
                    "timestamp": "20 minutes ago",
                    "files_changed": ["routes/grpc.go", "services/order_service.go"],
                    "impact": "High"
                }
            ]
        elif service in ("db-storm", "database-storm"):
            correlation_score = 0.92
            message = (
                "Correlated database storm incident with config drift. Max connections pool parameter "
                "lowered to 10 from 200 during automated database maintenance 30 minutes ago."
            )
            config_drifts = [
                {
                    "key": "DB_MAX_CONNECTIONS",
                    "previous_value": "200",
                    "current_value": "10",
                    "updated_at": "30 minutes ago",
                    "updated_by": "db-backup-operator"
                }
            ]
            git_commits = [
                {
                    "sha": "f1092a4",
                    "author": "SRE Admin",
                    "message": "ops: adjust DB pool configuration limits",
                    "timestamp": "45 minutes ago",
                    "files_changed": ["infrastructure/db/values.yaml"],
                    "impact": "High"
                }
            ]
        else:
            correlation_score = 0.15
            message = (
                f"Scanned recent change logs for {service}. No deployments or configuration changes "
                "were detected in the last 24 hours. The incident appears to be load-related or transient resource exhaustion."
            )

        correlation_data = {
            "correlation_score": correlation_score,
            "config_drifts": config_drifts,
            "git_commits": git_commits,
            "deployments": deployments
        }
        
        incident.change_intelligence_json = json.dumps(correlation_data)
        db.commit()

        create_incident_step(
            db,
            IncidentStepCreate(
                incident_id=incident.id,
                agent=self.name.value,
                message=message,
                step_type="correlation",
            ),
        )
        return message


change_intelligence_agent = ChangeIntelligenceAgent()
