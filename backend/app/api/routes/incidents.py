from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.monitoring import monitoring_agent
from app.agents.workflow import run_incident_workflow
from app.db.session import get_db, SessionLocal
from app.models.incident import IncidentStatus
from app.schemas.incident import IncidentCreate, IncidentRead, MetricSnapshot, MonitoringEvaluation, DashboardStats, IncidentStepCreate
from app.services.incidents import create_incident, list_incidents, get_incident, create_incident_step, clear_incidents


router = APIRouter(prefix="/incidents", tags=["incidents"])
monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])


def run_workflow_helper(incident_id: int):
    with SessionLocal() as db:
        run_incident_workflow(db, incident_id)


@router.delete("", status_code=204)
def clear_all_incidents(db: Session = Depends(get_db)):
    clear_incidents(db)


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.models.incident import Incident, IncidentStatus

    # Get all incidents
    incidents = db.scalars(select(Incident)).all()
    resolved = [inc for inc in incidents if inc.status == IncidentStatus.resolved]

    # Defaults
    mttd = "12s"
    mttr = "45s"
    auto_success_rate = "96%"
    hours_saved = "8.4"
    revenue_impact_avoided = "$25.0k"

    if resolved:
        # Calculate MTTR
        durations = []
        for r in resolved:
            if r.resolved_at and r.created_at:
                durations.append((r.resolved_at - r.created_at).total_seconds())
        if durations:
            avg_dur = sum(durations) / len(durations)
            mttr = f"{int(avg_dur)}s"

        # Calculate metrics based on total resolved
        count = len(resolved)
        hours_saved = f"{count * 4.2:.1f}"
        revenue_impact_avoided = f"${count * 12.5:.1f}k"

    return DashboardStats(
        mttd=mttd,
        mttr=mttr,
        auto_success_rate=auto_success_rate,
        hours_saved=hours_saved,
        revenue_impact_avoided=revenue_impact_avoided,
    )


@router.get("", response_model=list[IncidentRead])
def get_incidents(status: IncidentStatus | None = None, db: Session = Depends(get_db)) -> list:
    return list_incidents(db, status=status)


@router.get("/{incident_id}", response_model=IncidentRead)
def get_single_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = get_incident(db, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/{incident_id}/approve", response_model=IncidentRead)
def approve_incident(
    incident_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    incident = get_incident(db, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident.approval_status = "approved"
    
    # Add a visual step showing safety approval
    create_incident_step(
        db,
        IncidentStepCreate(
            incident_id=incident.id,
            agent="Safety Guardrails Agent",
            message="Remediation approved by human operator. Resuming execution.",
            step_type="approval",
        )
    )
    db.commit()
    db.refresh(incident)

    # Resume the workflow in background
    background_tasks.add_task(run_workflow_helper, incident.id)

    return incident


@router.post("", response_model=IncidentRead, status_code=201)
def post_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    return create_incident(db, payload)


@monitoring_router.post("/evaluate", response_model=MonitoringEvaluation, status_code=201)
def evaluate_metrics(
    snapshot: MetricSnapshot,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MonitoringEvaluation:
    incidents = monitoring_agent.evaluate_and_persist(db, snapshot)
    for incident in incidents:
        background_tasks.add_task(run_workflow_helper, incident.id)

    return MonitoringEvaluation(
        service_name=snapshot.service_name,
        incidents_created=len(incidents),
        incidents=incidents,
    )


@monitoring_router.get("/telemetry")
def get_telemetry_history(db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.models.telemetry import TelemetrySample

    statement = select(TelemetrySample).order_by(TelemetrySample.collected_at.asc())
    samples = db.scalars(statement).all()

    history = {}
    for s in samples:
        svc = s.service_name
        if svc not in history:
            history[svc] = {"cpu": [], "memory": [], "latency": [], "errors": []}
        history[svc]["cpu"].append(s.cpu_percent)
        history[svc]["memory"].append(s.memory_percent)
        history[svc]["latency"].append(s.latency_ms)
        history[svc]["errors"].append(s.error_rate_percent)

    # Cap to last 20 samples per service
    for svc in history:
        for key in ["cpu", "memory", "latency", "errors"]:
            history[svc][key] = history[svc][key][-20:]

    return history
