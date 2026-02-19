from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.report import Report

from datetime import datetime
from app.models.decision_event import DecisionEvent

def count_reports(
    db: Session,
    *,
    tenant_id: str,
    status: str | None = None,
    decision_event_id: str | None = None,
    decision_id: str | None = None,
    occurred_after: datetime | None = None,
    occurred_before: datetime | None = None,
) -> int:
    stmt = (
        select(func.count())
        .select_from(Report)
        .join(DecisionEvent, Report.decision_event_id == DecisionEvent.id)
        .where(Report.tenant_id == tenant_id)
        .where(DecisionEvent.tenant_id == tenant_id)
    )

    if status:
        stmt = stmt.where(Report.status == status)
    if decision_event_id:
        stmt = stmt.where(Report.decision_event_id == decision_event_id)
    if decision_id:
        stmt = stmt.where(DecisionEvent.decision_id == decision_id)
    if occurred_after:
        stmt = stmt.where(DecisionEvent.occurred_at >= occurred_after)
    if occurred_before:
        stmt = stmt.where(DecisionEvent.occurred_at <= occurred_before)

    return db.execute(stmt).scalar_one()


def list_reports(
    db: Session,
    *,
    tenant_id: str,
    offset: int,
    limit: int,
    status: str | None = None,
    decision_event_id: str | None = None,
    decision_id: str | None = None,
    occurred_after: datetime | None = None,
    occurred_before: datetime | None = None,
):
    stmt = (
        select(Report, DecisionEvent)
        .join(DecisionEvent, Report.decision_event_id == DecisionEvent.id)
        .where(Report.tenant_id == tenant_id)
        .where(DecisionEvent.tenant_id == tenant_id)
        .order_by(Report.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if status:
        stmt = stmt.where(Report.status == status)
    if decision_event_id:
        stmt = stmt.where(Report.decision_event_id == decision_event_id)
    if decision_id:
        stmt = stmt.where(DecisionEvent.decision_id == decision_id)
    if occurred_after:
        stmt = stmt.where(DecisionEvent.occurred_at >= occurred_after)
    if occurred_before:
        stmt = stmt.where(DecisionEvent.occurred_at <= occurred_before)

    return db.execute(stmt).all()  # devuelve tuplas (Report, DecisionEvent)

def get_existing_report(db: Session, *, tenant_id: str, decision_event_id: str, explanation_id: str, template_id: str) -> Report | None:
    stmt = select(Report).where(
        Report.tenant_id == tenant_id,
        Report.decision_event_id == decision_event_id,
        Report.explanation_id == explanation_id,
        Report.template_id == template_id,
    )
    return db.execute(stmt).scalars().first()
