from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.monitoring import monitoring_agent
from app.db.session import get_db
from app.models.incident import IncidentStatus
from app.schemas.incident import IncidentCreate, IncidentRead, MetricSnapshot, MonitoringEvaluation
from app.services.incidents import create_incident, list_incidents

router = APIRouter(prefix="/incidents", tags=["incidents"])
monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("", response_model=list[IncidentRead])
def get_incidents(status: IncidentStatus | None = None, db: Session = Depends(get_db)) -> list:
    return list_incidents(db, status=status)


@router.post("", response_model=IncidentRead, status_code=201)
def post_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    return create_incident(db, payload)


@monitoring_router.post("/evaluate", response_model=MonitoringEvaluation, status_code=201)
def evaluate_metrics(snapshot: MetricSnapshot, db: Session = Depends(get_db)) -> MonitoringEvaluation:
    incidents = monitoring_agent.evaluate_and_persist(db, snapshot)
    return MonitoringEvaluation(
        service_name=snapshot.service_name,
        incidents_created=len(incidents),
        incidents=incidents,
    )
