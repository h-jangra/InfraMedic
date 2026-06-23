from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

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
