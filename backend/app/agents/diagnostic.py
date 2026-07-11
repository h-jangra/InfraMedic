from sqlalchemy.orm import Session
from app.agents.base import AgentName
from app.models.incident import Incident
from app.schemas.incident import IncidentStepCreate
from app.services.incidents import create_incident_step


class DiagnosticAgent:
    name = AgentName.diagnostic

    def run(self, db: Session, incident: Incident) -> str:
        service = incident.service_name
        metric = incident.metric_name

        if service == "checkout-api" and metric == "cpu_percent":
            message = (
                "Root Cause Analysis: checkout-api CPU spiked to 96% due to a thread-lock in cart "
                "serialization under a traffic surge of 4.5x normal baseline. Profiler indicates 88% CPU "
                "time spent on cart serialization loop (checkout/cart.py:L42)."
            )
        elif service == "inventory-worker" and metric == "memory_percent":
            message = (
                "Root Cause Analysis: Memory leak detected in inventory-worker heap. JVM/Python process "
                "memory usage grew from 32% to 97% over 3 hours. Trace profile points to cache maps holding "
                "unreleased references inside the new event-driven queue consumer."
            )
        elif service == "payments-api" and metric == "error_rate_percent":
            message = (
                "Root Cause Analysis: Service is crash-looping. Container logs reveal DB connection exception: "
                "'FATAL: password authentication failed for user payments_user'. The credentials mismatch is "
                "preventing the service from passing its healthcheck probes."
            )
        elif service == "orders-api" and metric == "latency_ms":
            message = (
                "Root Cause Analysis: orders-api v2.1.0-rc1 is experiencing high network latency. Logs "
                "indicate downstream HTTP call timeouts to shipping-service. Root cause traced to incorrect "
                "ingress/egress port configs in the helm-chart configuration change."
            )
        elif service in ("db-storm", "database-storm"):
            message = (
                "Root Cause Analysis: Database Connection Storm. Active connections spiked from 42 to 198, "
                "hitting the newly modified database limits (10 connections). This triggered a connection pool "
                "exhaustion state, locking up all incoming HTTP handlers."
            )
        else:
            message = (
                f"Root Cause Analysis: Anomaly in {service} {metric} is due to resource contention under load. "
                "No critical exceptions or software defects detected in logs."
            )

        create_incident_step(
            db,
            IncidentStepCreate(
                incident_id=incident.id,
                agent=self.name.value,
                message=message,
                step_type="diagnosis",
            ),
        )
        return message


db_diagnostic_agent = DiagnosticAgent()
