from collections.abc import Generator
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


settings = get_settings()
try:
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    # Check connection
    with engine.connect() as conn:
        pass
except (OperationalError, Exception) as e:
    logger.warning(f"Failed to connect to PostgreSQL: {e}. Falling back to local SQLite.")
    engine = create_engine("sqlite:///inframedic.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
