from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.incidents import monitoring_router, router as incidents_router
from app.core.config import get_settings
from app.db.session import Base, engine
from app.models.incident import Incident
from app.models.telemetry import TelemetrySample

_ = (Incident, TelemetrySample)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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
