from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_api_client, get_db
from app.crud.explanations import (
    create_explanation,
    get_explanation,
    set_running,
    set_done,
    set_failed,
)
from app.schemas.explanation import ExplanationCreateOut, ExplanationOut

router = APIRouter(prefix="/explanations", tags=["explanations"])


def _compute_explanation_stub(tenant_id: str, explanation_id: str):
    # Import dentro para evitar problemas de import circular/tiempos de carga
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        set_running(db, tenant_id=tenant_id, explanation_id=explanation_id)

        # Aquí irá SHAP / reglas / contrafactuales. Por ahora devolvemos algo determinista.
        evidence = {
            "type": "stub",
            "main_factors": [
                {"feature": "income", "direction": "positive", "importance": 0.3},
                {"feature": "late_payments_12m", "direction": "negative", "importance": 0.6},
            ],
        }
        set_done(db, tenant_id=tenant_id, explanation_id=explanation_id, evidence=evidence)
    except Exception as e:
        set_failed(db, tenant_id=tenant_id, explanation_id=explanation_id, error=str(e))
    finally:
        db.close()


@router.post("", response_model=ExplanationCreateOut, status_code=status.HTTP_202_ACCEPTED)
def create_expl(background_tasks: BackgroundTasks, db: Session = Depends(get_db), client=Depends(require_api_client), decision_event_id: str = ""):
    if not decision_event_id:
        raise HTTPException(status_code=422, detail="decision_event_id is required")

    expl = create_explanation(db, tenant_id=client.tenant_id, decision_event_id=decision_event_id, method="stub")

    background_tasks.add_task(_compute_explanation_stub, client.tenant_id, expl.id)  # se ejecuta tras responder [web:292]
    return ExplanationCreateOut(explanation_id=expl.id, status=expl.status)


@router.get("/{explanation_id}", response_model=ExplanationOut)
def get_expl(explanation_id: str, db: Session = Depends(get_db), client=Depends(require_api_client)):
    expl = get_explanation(db, tenant_id=client.tenant_id, explanation_id=explanation_id)
    if not expl:
        raise HTTPException(status_code=404, detail="Explanation not found")

    return ExplanationOut(
        explanation_id=expl.id,
        status=expl.status,
        method=expl.method,
        evidence=expl.evidence or {},
        error=expl.error,
    )
