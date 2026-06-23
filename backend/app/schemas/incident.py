from datetime import datetime

from pydantic import BaseModel, Field

from app.models.incident import IncidentSeverity, IncidentStatus


class IncidentBase(BaseModel):
    title: str
    description: str
    service_name: str
    metric_name: str
    metric_value: float
    threshold: float
    severity: IncidentSeverity


class IncidentCreate(IncidentBase):
    agent: str = "Monitoring Agent"


class IncidentRead(IncidentBase):
    id: int
    status: IncidentStatus
    agent: str
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None
    resolution_summary: str | None = None

    model_config = {"from_attributes": True}


class MetricSnapshot(BaseModel):
    service_name: str = Field(default="checkout-api", min_length=1)
    cpu_percent: float = Field(ge=0, le=100)
    memory_percent: float = Field(ge=0, le=100)
    error_rate_percent: float = Field(ge=0)
    latency_ms: float = Field(ge=0)


class MonitoringEvaluation(BaseModel):
    service_name: str
    incidents_created: int
    incidents: list[IncidentRead]
