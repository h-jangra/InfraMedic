from datetime import datetime, timedelta
import json
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentSeverity, IncidentStatus, IncidentStep
from app.agents.base import AgentName


def seed_historical_incidents(db: Session):
    # Check if table already has rows
    existing = db.scalar(select(Incident))
    if existing is not None:
        return

    # Seed historical incidents
    historical_data = [
        {
            "title": "checkout-api cpu_percent anomaly",
            "description": "cpu_percent is 96.0%, above the critical threshold of 92.0%.",
            "service_name": "checkout-api",
            "metric_name": "cpu_percent",
            "metric_value": 96.0,
            "threshold": 92.0,
            "severity": IncidentSeverity.critical,
            "status": IncidentStatus.resolved,
            "agent": AgentName.communication.value,
            "created_at": datetime.now() - timedelta(days=5),
            "resolved_at": datetime.now() - timedelta(days=5) + timedelta(minutes=2),
            "resolution_summary": (
                "### ENGINEER SUMMARY\nAction selected: 'Scale Deployment'. Replicas scaled from 2 to 4.\n\n"
                "### MANAGER SUMMARY\nHigh CPU mitigated by auto-scaling checkout-api capacity.\n\n"
                "### EXECUTIVE SUMMARY\nZero transactions failed. Auto-remediation completed. Estimated SRE hours saved: 4.2."
            ),
            "risk_score": 45.0,
            "requires_approval": False,
            "approval_status": "not_required",
            "change_intelligence_json": json.dumps({
                "correlation_score": 0.45,
                "config_drifts": [],
                "git_commits": [
                    {
                        "sha": "a12d90b",
                        "author": "Alice S.",
                        "message": "docs: update inventory processing schema notes",
                        "timestamp": "5 days ago",
                        "files_changed": ["README.md"],
                        "impact": "Low"
                    }
                ],
                "deployments": []
            }),
            "time_machine_json": json.dumps({
                "similar_incidents": [
                    {
                        "incident_id": "INC-382",
                        "title": "High CPU on checkout-api",
                        "similarity_score": 95,
                        "resolution": "Scale Deployment",
                        "status": "resolved",
                        "recovery_time": "120s"
                    }
                ],
                "recommendations": [
                    {"action": "Scale Deployment", "success_rate": 92}
                ],
                "expected_recovery_prediction": "Expected recovery time: 120s."
            }),
            "steps": [
                {
                    "agent": AgentName.monitoring.value,
                    "message": "checkout-api cpu_percent is 96.0%, above threshold.",
                    "step_type": "alert",
                },
                {
                    "agent": AgentName.change_intelligence.value,
                    "message": "Scanned changes. No deployments in last 24h.",
                    "step_type": "correlation",
                },
                {
                    "agent": AgentName.diagnostic.value,
                    "message": "Thread lock in cart serialization.",
                    "step_type": "diagnosis",
                },
                {
                    "agent": AgentName.knowledge.value,
                    "message": "SOP-023 recommends scaling replicas.",
                    "step_type": "knowledge_retrieval",
                },
                {
                    "agent": AgentName.incident_time_machine.value,
                    "message": "Scale deployment: 92% success rate.",
                    "step_type": "history_correlation",
                },
                {
                    "agent": AgentName.remediation.value,
                    "message": "Scale deployment command executed.",
                    "step_type": "remediation",
                },
                {
                    "agent": AgentName.validation.value,
                    "message": "Verification successful. CPU: 42%.",
                    "step_type": "validation",
                },
                {
                    "agent": AgentName.communication.value,
                    "message": "Summaries generated.",
                    "step_type": "summarization",
                },
            ],
        },
        {
            "title": "inventory-worker memory_percent anomaly",
            "description": "memory_percent is 97.0%, above the critical threshold of 94.0%.",
            "service_name": "inventory-worker",
            "metric_name": "memory_percent",
            "metric_value": 97.0,
            "threshold": 94.0,
            "severity": IncidentSeverity.critical,
            "status": IncidentStatus.resolved,
            "agent": AgentName.communication.value,
            "created_at": datetime.now() - timedelta(days=3),
            "resolved_at": datetime.now() - timedelta(days=3) + timedelta(minutes=1, seconds=30),
            "resolution_summary": (
                "### ENGINEER SUMMARY\nAction selected: 'Restart Service'. JVM process restarted successfully.\n\n"
                "### MANAGER SUMMARY\nMemory leak mitigated by worker service restart.\n\n"
                "### EXECUTIVE SUMMARY\nAuto-remediation restarted inventory-worker without queue processing delay. Estimated SRE hours saved: 3.5."
            ),
            "risk_score": 35.0,
            "requires_approval": False,
            "approval_status": "not_required",
            "change_intelligence_json": json.dumps({
                "correlation_score": 0.94,
                "config_drifts": [
                    {
                        "key": "CACHE_TTL_SECONDS",
                        "previous_value": "300",
                        "current_value": "86400",
                        "updated_at": "3 days ago",
                        "updated_by": "ci-cd-bot"
                    }
                ],
                "git_commits": [
                    {
                        "sha": "e93f21a",
                        "author": "Marcus Aurelius",
                        "message": "perf: upgrade memory-cache library and switch to Redis backing",
                        "timestamp": "3 days ago",
                        "files_changed": ["src/cache/local_cache.go", "go.mod"],
                        "impact": "High"
                    }
                ],
                "deployments": [
                    {
                        "version": "v1.4.22",
                        "timestamp": "3 days ago",
                        "status": "completed",
                        "environment": "production",
                        "service": "inventory-worker"
                    }
                ]
            }),
            "time_machine_json": json.dumps({
                "similar_incidents": [
                    {
                        "incident_id": "INC-290",
                        "title": "Memory growth in inventory-worker",
                        "similarity_score": 98,
                        "resolution": "Restart Service",
                        "status": "resolved",
                        "recovery_time": "80s"
                    }
                ],
                "recommendations": [
                    {"action": "Restart Service", "success_rate": 100}
                ],
                "expected_recovery_prediction": "Expected recovery time: 80s."
            }),
            "steps": [
                {
                    "agent": AgentName.monitoring.value,
                    "message": "inventory-worker memory_percent is 97.0%, above threshold.",
                    "step_type": "alert",
                },
                {
                    "agent": AgentName.change_intelligence.value,
                    "message": "Correlated with deployment 'v1.4.22' of inventory-worker.",
                    "step_type": "correlation",
                },
                {
                    "agent": AgentName.diagnostic.value,
                    "message": "Heap memory leak due to bad caching in queue consumer.",
                    "step_type": "diagnosis",
                },
                {
                    "agent": AgentName.knowledge.value,
                    "message": "SOP-104 recommends worker process restart.",
                    "step_type": "knowledge_retrieval",
                },
                {
                    "agent": AgentName.incident_time_machine.value,
                    "message": "Restart Service: 100% success rate.",
                    "step_type": "history_correlation",
                },
                {
                    "agent": AgentName.remediation.value,
                    "message": "Restart service command executed.",
                    "step_type": "remediation",
                },
                {
                    "agent": AgentName.validation.value,
                    "message": "Verification successful. Memory stabilized at 51%.",
                    "step_type": "validation",
                },
                {
                    "agent": AgentName.communication.value,
                    "message": "Summaries generated and uploaded.",
                    "step_type": "summarization",
                },
            ],
        },
    ]

    for item in historical_data:
        steps_data = item.pop("steps")
        incident = Incident(**item)
        db.add(incident)
        db.flush()
        for step in steps_data:
            db.add(IncidentStep(incident_id=incident.id, **step))
    db.commit()
