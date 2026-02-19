import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.explanation import Explanation


def create_explanation(db: Session, *, tenant_id: str, decision_event_id: str, method: str = "stub") -> Explanation:
    obj = Explanation(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        decision_event_id=decision_event_id,
        status="PENDING",
        method=method,
        evidence={},
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_explanation(db: Session, *, tenant_id: str, explanation_id: str) -> Explanation | None:
    stmt = select(Explanation).where(
        Explanation.tenant_id == tenant_id,
        Explanation.id == explanation_id,
    )
    return db.execute(stmt).scalars().first()


def set_running(db: Session, *, tenant_id: str, explanation_id: str) -> None:
    obj = get_explanation(db, tenant_id=tenant_id, explanation_id=explanation_id)
    if not obj:
        return
    obj.status = "RUNNING"
    db.commit()


def set_done(db: Session, *, tenant_id: str, explanation_id: str, evidence: dict) -> None:
    obj = get_explanation(db, tenant_id=tenant_id, explanation_id=explanation_id)
    if not obj:
        return
    obj.status = "DONE"
    obj.evidence = evidence
    obj.error = None
    db.commit()


def set_failed(db: Session, *, tenant_id: str, explanation_id: str, error: str) -> None:
    obj = get_explanation(db, tenant_id=tenant_id, explanation_id=explanation_id)
    if not obj:
        return
    obj.status = "FAILED"
    obj.error = error[:512]
    db.commit()
