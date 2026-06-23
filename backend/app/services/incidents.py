from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentStatus
from app.schemas.incident import IncidentCreate


def list_incidents(db: Session, status: IncidentStatus | None = None) -> list[Incident]:
    statement = select(Incident).order_by(Incident.created_at.desc())
    if status is not None:
        statement = statement.where(Incident.status == status)
    return list(db.scalars(statement).all())


def create_incident(db: Session, payload: IncidentCreate) -> Incident:
    incident = Incident(**payload.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident
