from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Explanation(Base):
    __tablename__ = "explanations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    decision_event_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("decision_events.id"), index=True
    )

    status: Mapped[str] = mapped_column(String(16), index=True)  # PENDING/RUNNING/DONE/FAILED
    method: Mapped[str] = mapped_column(String(32), default="stub")

    evidence: Mapped[dict] = mapped_column(JSON, default=dict)  # aquí meteremos SHAP/razones/etc.
    error: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
