from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_api_client, get_db
from app.schemas.decision_event import DecisionEventIn, DecisionEventOut
from app.crud.decision_events import get_by_idempotency, create_event

router = APIRouter(prefix="/decision-events", tags=["decision-events"])


@router.post("", response_model=DecisionEventOut)
def post_decision_event(
    payload: DecisionEventIn,
    db: Session = Depends(get_db),
    client=Depends(require_api_client),
):
    existing = get_by_idempotency(db, tenant_id=client.tenant_id, idempotency_key=payload.idempotency_key)
    if existing:
        return DecisionEventOut(event_id=existing.id, created=False)

    data = payload.model_dump()
    data["tenant_id"] = client.tenant_id
    obj = create_event(db, payload=data)

    return DecisionEventOut(event_id=obj.id, created=True)
