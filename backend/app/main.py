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
                # Run resource discovery every 30s to detect cloud changes
                global discovery_tick
                if "discovery_tick" not in globals():
                    discovery_tick = 0
                discovery_tick += 1
                if discovery_tick >= 10:
                    discovery_tick = 0
                    try:
                        from app.services.discovery import discover_all_resources
                        discover_all_resources(db)
                    except Exception as de:
                        logger.warning(f"Auto discovery sync failed: {de}")

                c_settings = get_cloud_settings(db)
                provider_name = "floci"
                aws_endpoint = c_settings.get("aws_endpoint_url", "")
                if aws_endpoint and "localhost" not in aws_endpoint and "127.0.0.1" not in aws_endpoint:
                    provider_name = "aws"
                elif c_settings.get("azure_subscription_id"):
                    provider_name = "azure"
                elif c_settings.get("gcp_project_id") and c_settings.get("gcp_project_id") != "floci-gcp-project":
                    provider_name = "gcp"

                provider = get_cloud_provider(provider_name)

                instances = db.scalars(select(CloudResource).where(CloudResource.resource_type == "compute")).all()
                if not instances:
                    continue

                active_incidents = db.scalars(select(Incident).where(Incident.status != IncidentStatus.resolved)).all()
                active_services = {inc.service_name: inc for inc in active_incidents}

                for inst in instances:
                    svc = inst.name
                    
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
                    if cpu > 92.0:
                        breaching_metric = "cpu_percent"
                        breach_val = cpu
                    elif mem > 94.0:
                        breaching_metric = "memory_percent"
                        breach_val = mem
                    elif err > 8.0:
                        breaching_metric = "error_rate_percent"
                        breach_val = err
                    elif lat > 1000.0:
                        breaching_metric = "latency_ms"
                        breach_val = lat

                    if breaching_metric and svc not in active_services:
                        title = f"High {breaching_metric.replace('_', ' ')} detected on {svc}"
                        logger.info(f"Threshold breach detected: {svc} {breaching_metric} = {breach_val:.2f}. Raising incident ticket.")
                        
                        incident = create_incident(
                            db=db,
                            title=title,
                            service_name=svc,
                            metric_name=breaching_metric,
                            metric_value=breach_val
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
