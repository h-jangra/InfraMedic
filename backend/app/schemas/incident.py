from datetime import datetime

from pydantic import BaseModel, Field

from app.models.incident import IncidentSeverity, IncidentStatus


class IncidentStepBase(BaseModel):
    incident_id: int
    agent: str
    message: str
    step_type: str = "analysis"


class IncidentStepCreate(IncidentStepBase):
    pass


class IncidentStepRead(IncidentStepBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


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
    change_intelligence_json: str | None = None
    time_machine_json: str | None = None
    risk_score: float | None = 0.0
    requires_approval: bool | None = False
    approval_status: str | None = "not_required"
    steps: list[IncidentStepRead] = []

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


class DashboardStats(BaseModel):
    mttd: str
    mttr: str
    auto_success_rate: str
    hours_saved: str
    revenue_impact_avoided: str
