import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.decision_event import DecisionEvent


def get_by_idempotency(db: Session, *, tenant_id: str, idempotency_key: str) -> DecisionEvent | None:
    stmt = select(DecisionEvent).where(
        DecisionEvent.tenant_id == tenant_id,
        DecisionEvent.idempotency_key == idempotency_key,
    )
    return db.execute(stmt).scalars().first()


def create_event(db: Session, *, payload: dict) -> DecisionEvent:
    obj = DecisionEvent(
        id=str(uuid.uuid4()),
        tenant_id=payload["tenant_id"],
        decision_id=payload["decision_id"],
        occurred_at=payload["occurred_at"],
        model_id=payload["model"]["model_id"],
        model_version=payload["model"]["model_version"],
        input_features=payload["input_features"],
        model_output=payload["model_output"],
        final_decision=payload["final_decision"],
        idempotency_key=payload["idempotency_key"],
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
