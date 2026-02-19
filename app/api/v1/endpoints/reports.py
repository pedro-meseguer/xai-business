import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import require_api_client, get_db
from app.models.decision_event import DecisionEvent
from app.models.explanation import Explanation
from app.models.report import Report
from app.schemas.report import ReportCreateIn, ReportCreateOut, ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])
from pydantic import ValidationError
from app.schemas.report_schema_v1 import ReportSchemaV1

from pydantic import ValidationError
from app.services.report_builder import build_report_schema_v1
from app.schemas.report_schema_v1 import ReportSchemaV1

from fastapi import Query
from app.crud.reports import count_reports, list_reports
from app.schemas.report import ReportListOut, ReportListItem

from app.crud.reports import get_existing_report

from datetime import datetime
from fastapi import Query
from app.crud.reports import count_reports, list_reports
from app.schemas.report import ReportListOut, ReportListItem

from datetime import datetime, timezone
from app.schemas.report_finalize import ReportFinalizeIn

from app.crud.report_revisions import add_revision

@router.post("", response_model=ReportCreateOut, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreateIn, db: Session = Depends(get_db), client=Depends(require_api_client)):
    de = db.execute(
        select(DecisionEvent).where(
            DecisionEvent.tenant_id == client.tenant_id,
            DecisionEvent.id == payload.decision_event_id,
        )
    ).scalars().first()
    if not de:
        raise HTTPException(status_code=404, detail="DecisionEvent not found")

    ex = db.execute(
        select(Explanation).where(
            Explanation.tenant_id == client.tenant_id,
            Explanation.id == payload.explanation_id,
        )
    ).scalars().first()
    if not ex:
        raise HTTPException(status_code=404, detail="Explanation not found")
    if ex.status != "DONE":
        raise HTTPException(status_code=409, detail="Explanation not DONE")

    existing = get_existing_report(
    db,
    tenant_id=client.tenant_id,
    decision_event_id=de.id,
    explanation_id=ex.id,
    template_id=payload.template_id,
    )
    if existing:
        return ReportCreateOut(report_id=existing.id, status=existing.status)

    try:
        validated = build_report_schema_v1(template_id=payload.template_id, de=de, ex=ex)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())

    report_json = validated.model_dump(mode="json")

    rpt = Report(
        id=str(uuid.uuid4()),
        tenant_id=client.tenant_id,
        decision_event_id=payload.decision_event_id,
        explanation_id=payload.explanation_id,
        template_id=payload.template_id,
        status="DRAFT",
        version=1,  # <-- clave
        report_json=report_json,
        updated_by_client_id=client.id,
    )

    db.add(rpt)

    add_revision(
        db,
        tenant_id=client.tenant_id,
        report_id=rpt.id,
        version=rpt.version,          # ahora es 1, no None
        action="CREATE",
        report_json=rpt.report_json,
        created_by_client_id=client.id,
    )

    db.commit()
    db.refresh(rpt)

    return ReportCreateOut(report_id=rpt.id, status=rpt.status)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db), client=Depends(require_api_client)):
    rpt = db.execute(
        select(Report).where(Report.tenant_id == client.tenant_id, Report.id == report_id)
    ).scalars().first()
    if not rpt:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        validated = ReportSchemaV1.model_validate(rpt.report_json or {})
    except ValidationError as e:
        raise HTTPException(status_code=500, detail={"msg": "Stored report_json is invalid", "errors": e.errors()})

    return ReportOut(
        report_id=rpt.id,
        status=rpt.status,
        template_id=rpt.template_id,
        report_json=validated.model_dump(mode="json"),
        report_text=rpt.report_text,
        version=rpt.version
    )

@router.get("", response_model=ReportListOut)
def get_reports(
    db: Session = Depends(get_db),
    client=Depends(require_api_client),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, gt=0, le=100),

    status: str | None = None,
    decision_event_id: str | None = None,
    decision_id: str | None = None,
    occurred_after: datetime | None = None,
    occurred_before: datetime | None = None,
):
    total = count_reports(
        db,
        tenant_id=client.tenant_id,
        status=status,
        decision_event_id=decision_event_id,
        decision_id=decision_id,
        occurred_after=occurred_after,
        occurred_before=occurred_before,
    )

    rows = list_reports(
        db,
        tenant_id=client.tenant_id,
        offset=offset,
        limit=limit,
        status=status,
        decision_event_id=decision_event_id,
        decision_id=decision_id,
        occurred_after=occurred_after,
        occurred_before=occurred_before,
    )

    items = []
    for r, de in rows:
        label = (de.final_decision or {}).get("label") if isinstance(de.final_decision, dict) else None
        items.append(
            ReportListItem(
                report_id=r.id,
                status=r.status,
                template_id=r.template_id,
                decision_event_id=r.decision_event_id,
                explanation_id=r.explanation_id,
                created_at=r.created_at,
                decision_id=de.decision_id,
                occurred_at=de.occurred_at,
                decision_label=label,
                version=r.version
            )
        )

    return ReportListOut(total=total, items=items, offset=offset, limit=limit)


from pydantic import ValidationError
from app.schemas.report import ReportUpdateIn
from app.schemas.report_schema_v1 import ReportSchemaV1

@router.patch("/{report_id}", response_model=ReportOut)
def patch_report(
    report_id: str,
    payload: ReportUpdateIn,
    db: Session = Depends(get_db),
    client=Depends(require_api_client),
):
    rpt = db.execute(
        select(Report).where(Report.tenant_id == client.tenant_id, Report.id == report_id)
    ).scalars().first()

    if not rpt:
        raise HTTPException(status_code=404, detail="Report not found")

    if rpt.status == "FINAL":
        raise HTTPException(status_code=409, detail="Report is FINAL and cannot be edited")

    if payload.expected_version != rpt.version:
        raise HTTPException(status_code=409, detail={"msg": "Version conflict", "current_version": rpt.version})

    # 1) valida lo almacenado
    try:
        current = ReportSchemaV1.model_validate(rpt.report_json or {})
    except ValidationError as e:
        raise HTTPException(status_code=500, detail={"msg": "Stored report_json is invalid", "errors": e.errors()})

    # 2) aplica patch parcial (solo si viene)
    updated_dict = current.model_dump()
    patch = payload.model_dump(exclude_unset=True)
    if "sections" in patch:
        updated_dict["sections"] = patch["sections"]

    # 3) revalida y guarda
    try:
        validated = ReportSchemaV1.model_validate(updated_dict)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())

    rpt.report_json = validated.model_dump(mode="json")
    rpt.version += 1
    rpt.updated_by_client_id = client.id
    add_revision(
        db,
        tenant_id=client.tenant_id,
        report_id=rpt.id,
        version=rpt.version,
        action="PATCH",
        report_json=rpt.report_json,
        created_by_client_id=client.id,
    )
    db.commit()
    db.refresh(rpt)

    return ReportOut(
        report_id=rpt.id,
        status=rpt.status,
        template_id=rpt.template_id,
        version=rpt.version,          # <-- AÑADE ESTO
        report_json=validated.model_dump(mode="json"),
        report_text=rpt.report_text,
    )

@router.post("/{report_id}/finalize", response_model=ReportOut)
def finalize_report(
    report_id: str,
    payload: ReportFinalizeIn,
    db: Session = Depends(get_db),
    client=Depends(require_api_client),
):
    rpt = db.execute(
        select(Report).where(Report.tenant_id == client.tenant_id, Report.id == report_id)
    ).scalars().first()
    if not rpt:
        raise HTTPException(status_code=404, detail="Report not found")

    if rpt.status == "FINAL":
        raise HTTPException(status_code=409, detail="Report already FINAL")

    if payload.expected_version != rpt.version:
        raise HTTPException(
            status_code=409,
            detail={"msg": "Version conflict", "current_version": rpt.version},
        )

    rpt.status = "FINAL"
    rpt.finalized_at = datetime.now(timezone.utc)
    rpt.finalized_by_client_id = client.id
    rpt.version += 1

    add_revision(
        db,
        tenant_id=client.tenant_id,
        report_id=rpt.id,
        version=rpt.version,
        action="FINALIZE",
        report_json=rpt.report_json,
        created_by_client_id=client.id,
    )
    db.commit()
    db.refresh(rpt)

    validated = ReportSchemaV1.model_validate(rpt.report_json or {})
    return ReportOut(
        report_id=rpt.id,
        status=rpt.status,
        template_id=rpt.template_id,
        report_json=validated.model_dump(mode="json"),
        report_text=rpt.report_text,
        version=rpt.version,  # si ya lo añadiste en ReportOut
    )

from fastapi import Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.security import require_api_client, get_db
from app.models.report_revision import ReportRevision
from app.schemas.report_revision import ReportRevisionItem, ReportRevisionListOut


@router.get("/{report_id}/revisions", response_model=ReportRevisionListOut)
def list_report_revisions(
    report_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    client=Depends(require_api_client),
):
    filters = (
        ReportRevision.tenant_id == client.tenant_id,
        ReportRevision.report_id == report_id,
    )

    total = db.execute(
        select(func.count()).select_from(ReportRevision).where(*filters)
    ).scalar_one()

    rows = db.execute(
        select(ReportRevision)
        .where(*filters)
        .order_by(ReportRevision.version.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()

    items = [
        ReportRevisionItem(
            id=r.id,
            version=r.version,
            action=r.action,
            created_at=r.created_at,
            created_by_client_id=r.created_by_client_id,
        )
        for r in rows
    ]

    return ReportRevisionListOut(total=total, items=items, offset=offset, limit=limit)
