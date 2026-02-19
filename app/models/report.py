from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, JSON, String, func, UniqueConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint("tenant_id", "decision_event_id", "explanation_id", "template_id", name="uq_report_identity"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    decision_event_id: Mapped[str] = mapped_column(String(36), ForeignKey("decision_events.id"), index=True)
    explanation_id: Mapped[str] = mapped_column(String(36), ForeignKey("explanations.id"), index=True)

    template_id: Mapped[str] = mapped_column(String(64), default="generic_v1")
    status: Mapped[str] = mapped_column(String(16), index=True)  # DRAFT/FINAL (por ahora DRAFT)

    report_json: Mapped[dict] = mapped_column(JSON, default=dict)
    report_text: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    schema_version: Mapped[str] = mapped_column(String(8), default="1.0")
    template_version: Mapped[str] = mapped_column(String(16), default="1")

    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by_client_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finalized_by_client_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
