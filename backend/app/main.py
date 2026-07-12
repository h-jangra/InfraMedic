from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.incidents import monitoring_router, router as incidents_router
from app.api.routes.settings import router as settings_router
from app.api.routes.resources import router as resources_router
from app.core.config import get_settings
from app.core.websocket import websocket_manager
from app.db.session import Base, engine, SessionLocal
from app.db.seed import seed_historical_incidents
from app.models.incident import Incident, IncidentStep
from app.models.telemetry import TelemetrySample
from app.models.setting import SystemSetting
from app.models.resource import CloudResource

_ = (Incident, IncidentStep, TelemetrySample, SystemSetting, CloudResource)


import threading
import time
import random
import logging

logger = logging.getLogger(__name__)


def run_incident_workflow_thread(incident_id: int):
    try:
        from app.db.session import SessionLocal
        from app.agents.workflow import run_incident_workflow
        with SessionLocal() as db:
            run_incident_workflow(db, incident_id)
    except Exception as e:
        logger.error(f"Error running background workflow: {e}")


def telemetry_daemon():
    logger.info("Telemetry daemon thread started.")
    from app.services.cloud import get_cloud_provider
    from app.services.settings import get_cloud_settings
    from app.services.incidents import create_incident
    from sqlalchemy import select

    while True:
        try:
            time.sleep(3.0)
            from app.db.session import SessionLocal
            from app.models.resource import CloudResource
            from app.models.incident import Incident, IncidentStatus
            from app.models.telemetry import TelemetrySample

            with SessionLocal() as db:
                c_settings = get_cloud_settings(db)

                instances = db.scalars(select(CloudResource).where(CloudResource.resource_type == "compute")).all()
                if not instances:
                    continue

                active_incidents = db.scalars(select(Incident).where(Incident.status != IncidentStatus.resolved)).all()
                active_services = {inc.service_name: inc for inc in active_incidents}

                for inst in instances:
                    svc = inst.name
                    
                    import json
                    is_real_cloud = False
                    cpu = None
                    mem = None

                    try:
                        details = json.loads(inst.details_json) if inst.details_json else {}
                        provider_name = details.get("discovery_provider") or details.get("provider", "")
                        if provider_name.lower() in ("aws", "azure", "gcp"):
                            is_real_cloud = True
                            ip = details.get("ip")
                            instance_id = details.get("id") or inst.resource_id

                            from app.services.cloud.metrics import fetch_real_host_metrics
                            real_cpu, real_mem = fetch_real_host_metrics(ip, instance_id, provider_name, c_settings)
                            if real_cpu is not None:
                                cpu = real_cpu
                            if real_mem is not None:
                                mem = real_mem
                    except Exception as me:
                        logger.warning(f"Error fetching real metrics for {svc}: {me}")

                    if not is_real_cloud:
                        cpu = 20.0 + random.random() * 15.0
                        mem = 40.0 + random.random() * 10.0
                        lat = 100.0 + random.random() * 50.0
                        err = random.random() * 0.1

                        if svc in active_services:
                            inc = active_services[svc]
                            if inc.metric_name == "cpu_percent":
                                cpu = 94.0 + random.random() * 4.0
                            elif inc.metric_name == "memory_percent":
                                mem = 96.0 + random.random() * 3.0
                            elif inc.metric_name == "error_rate_percent":
                                err = 8.5 + random.random() * 2.0
                                lat = 850.0 + random.random() * 100.0
                            elif inc.metric_name == "latency_ms":
                                lat = 1200.0 + random.random() * 200.0
                                err = 2.5 + random.random() * 1.5
                    else:
                        if cpu is None:
                            cpu = 20.0 + random.random() * 15.0
                        if mem is None:
                            mem = 40.0 + random.random() * 10.0
                        lat = 100.0 + random.random() * 50.0
                        err = random.random() * 0.1

                    sample = TelemetrySample(
                        service_name=svc,
                        cpu_percent=cpu,
                        memory_percent=mem,
                        error_rate_percent=err,
                        latency_ms=lat
                    )
                    db.add(sample)
                    db.flush()

                    breaching_metric = None
                    breach_val = 0
                    threshold_val = 0.0
                    if cpu > 92.0:
                        breaching_metric = "cpu_percent"
                        breach_val = cpu
                        threshold_val = 92.0
                    elif mem > 94.0:
                        breaching_metric = "memory_percent"
                        breach_val = mem
                        threshold_val = 94.0
                    elif err > 8.0:
                        breaching_metric = "error_rate_percent"
                        breach_val = err
                        threshold_val = 8.0
                    elif lat > 1000.0:
                        breaching_metric = "latency_ms"
                        breach_val = lat
                        threshold_val = 1000.0

                    if breaching_metric and svc not in active_services:
                        title = f"High {breaching_metric.replace('_', ' ')} detected on {svc}"
                        logger.info(f"Threshold breach detected: {svc} {breaching_metric} = {breach_val:.2f}. Raising incident ticket.")
                        
                        from app.schemas.incident import IncidentCreate
                        from app.models.incident import IncidentSeverity

                        payload = IncidentCreate(
                            title=title,
                            description=f"{breaching_metric.replace('_', ' ')} is {breach_val:.2f}, above the threshold of {threshold_val}.",
                            service_name=svc,
                            metric_name=breaching_metric,
                            metric_value=breach_val,
                            threshold=threshold_val,
                            severity=IncidentSeverity.critical,
                            agent="Monitoring Agent"
                        )
                        
                        incident = create_incident(
                            db=db,
                            payload=payload
                        )
                        
                        threading.Thread(
                            target=run_incident_workflow_thread,
                            args=(incident.id,),
                            daemon=True
                        ).start()

                db.commit()
        except Exception as e:
            logger.warning(f"Telemetry daemon error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_historical_incidents(db)

    # Start telemetry loop thread
    t = threading.Thread(target=telemetry_daemon, daemon=True)
    t.start()

    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(incidents_router, prefix=settings.api_prefix)
app.include_router(monitoring_router, prefix=settings.api_prefix)
app.include_router(settings_router, prefix=settings.api_prefix)
app.include_router(resources_router, prefix=settings.api_prefix)


@app.websocket("/ws/incidents/{incident_id}")
async def websocket_endpoint(websocket: WebSocket, incident_id: int):
    await websocket_manager.connect(incident_id, websocket)
    try:
        while True:
            # Maintain connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(incident_id, websocket)
