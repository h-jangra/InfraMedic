from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentStatus, IncidentStep
from app.schemas.incident import IncidentCreate, IncidentStepCreate


def list_incidents(db: Session, status: IncidentStatus | None = None) -> list[Incident]:
    statement = select(Incident).order_by(Incident.created_at.desc())
    if status is not None:
        statement = statement.where(Incident.status == status)
    return list(db.scalars(statement).all())


def get_incident(db: Session, incident_id: int) -> Incident | None:
    return db.scalar(select(Incident).where(Incident.id == incident_id))


def create_incident(db: Session, payload: IncidentCreate) -> Incident:
    incident = Incident(**payload.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Automatically create the initial alert step
    from app.models.incident import IncidentStep
    alert_step = IncidentStep(
        incident_id=incident.id,
        agent="Monitoring Agent",
        message=f"CRITICAL alert triggered. Symptoms: {incident.description}",
        step_type="alert"
    )
    db.add(alert_step)
    db.commit()
    db.refresh(incident)

    return incident


def clear_incidents(db: Session) -> None:
    db.execute(delete(IncidentStep))
    db.execute(delete(Incident))
    db.commit()


def create_incident_step(db: Session, payload: IncidentStepCreate) -> IncidentStep:
    step = IncidentStep(**payload.model_dump())
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


def update_incident_status(
    db: Session,
    incident_id: int,
    status: IncidentStatus,
    agent: str,
    resolution_summary: str | None = None,
) -> Incident | None:
    incident = get_incident(db, incident_id)
    if incident is None:
        return None
    incident.status = status
    incident.agent = agent
    if status == IncidentStatus.resolved:
        incident.resolved_at = datetime.now()
        incident.resolution_summary = resolution_summary
    db.commit()
    db.refresh(incident)
    return incident
