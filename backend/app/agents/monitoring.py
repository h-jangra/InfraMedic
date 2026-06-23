from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.agents.base import AgentName
from app.models.telemetry import TelemetrySample
from app.schemas.incident import IncidentCreate, MetricSnapshot
from app.services.incidents import create_incident


@dataclass(frozen=True)
class Threshold:
    metric_name: str
    value: float
    warning: float
    critical: float
    unit: str


class MonitoringAgent:
    name = AgentName.monitoring

    def evaluate(self, db: Session, snapshot: MetricSnapshot) -> list[IncidentCreate]:
        db.add(
            TelemetrySample(
                service_name=snapshot.service_name,
                cpu_percent=snapshot.cpu_percent,
                memory_percent=snapshot.memory_percent,
                error_rate_percent=snapshot.error_rate_percent,
                latency_ms=snapshot.latency_ms,
            )
        )
        candidates = [
            Threshold("cpu_percent", snapshot.cpu_percent, 80, 92, "%"),
            Threshold("memory_percent", snapshot.memory_percent, 82, 94, "%"),
            Threshold("error_rate_percent", snapshot.error_rate_percent, 2, 5, "%"),
            Threshold("latency_ms", snapshot.latency_ms, 600, 1200, "ms"),
        ]

        incidents: list[IncidentCreate] = []
        for candidate in candidates:
            severity = self._severity(candidate)
            if severity is None:
                continue
            incidents.append(
                IncidentCreate(
                    title=f"{snapshot.service_name} {candidate.metric_name} anomaly",
                    description=(
                        f"{candidate.metric_name} is {candidate.value}{candidate.unit}, "
                        f"above the {severity} threshold of {candidate.critical if severity == 'critical' else candidate.warning}{candidate.unit}."
                    ),
                    service_name=snapshot.service_name,
                    metric_name=candidate.metric_name,
                    metric_value=candidate.value,
                    threshold=candidate.critical if severity == "critical" else candidate.warning,
                    severity=severity,
                    agent=self.name.value,
                )
            )
        return incidents

    def evaluate_and_persist(self, db: Session, snapshot: MetricSnapshot):
        incident_payloads = self.evaluate(db, snapshot)
        created = [create_incident(db, payload) for payload in incident_payloads]
        db.commit()
        return created

    @staticmethod
    def _severity(threshold: Threshold) -> str | None:
        if threshold.value >= threshold.critical:
            return "critical"
        if threshold.value >= threshold.warning:
            return "warning"
        return None


monitoring_agent = MonitoringAgent()
