from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CloudResource(Base):
    __tablename__ = "cloud_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # compute, storage, database, secret, networking
    resource_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Active")
    details_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
