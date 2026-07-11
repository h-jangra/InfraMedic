from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class IncidentSeverity(StrEnum):
    info = "info"
    warning = "warning"
    critical = "critical"


class IncidentStatus(StrEnum):
    active = "active"
    resolving = "resolving"
    resolved = "resolved"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    service_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(80), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus),
        nullable=False,
        default=IncidentStatus.active,
        index=True,
    )
    agent: Mapped[str] = mapped_column(String(120), nullable=False, default="Monitoring Agent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phase 2 Enhancements
    change_intelligence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_machine_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    requires_approval: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    approval_status: Mapped[str | None] = mapped_column(String(40), nullable=True, default="not_required")

    steps: Mapped[list["IncidentStep"]] = relationship("IncidentStep", back_populates="incident", cascade="all, delete-orphan")


class IncidentStep(Base):
    __tablename__ = "incident_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    agent: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    step_type: Mapped[str] = mapped_column(String(50), nullable=False, default="analysis")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped["Incident"] = relationship("Incident", back_populates="steps")
