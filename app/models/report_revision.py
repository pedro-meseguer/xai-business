import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReportRevision(Base):
    __tablename__ = "report_revisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    report_id: Mapped[str] = mapped_column(String(36), ForeignKey("reports.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, index=True)

    action: Mapped[str] = mapped_column(String(16))  # CREATE / PATCH / FINALIZE
    report_json: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by_client_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
