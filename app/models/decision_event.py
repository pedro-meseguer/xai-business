from datetime import datetime
from sqlalchemy import DateTime, String, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DecisionEvent(Base):
    __tablename__ = "decision_events"
    __table_args__ = (
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_tenant_idempo"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    decision_id: Mapped[str] = mapped_column(String(128), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    model_id: Mapped[str] = mapped_column(String(128))
    model_version: Mapped[str] = mapped_column(String(64))

    input_features: Mapped[dict] = mapped_column(JSON)
    model_output: Mapped[dict] = mapped_column(JSON)
    final_decision: Mapped[dict] = mapped_column(JSON)

    idempotency_key: Mapped[str] = mapped_column(String(128))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
