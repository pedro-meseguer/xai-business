from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import require_api_client, get_db
from app.models.report import Report
from app.services.report_renderer import render_report_text

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/{report_id}/render")
def render_report(report_id: str, db: Session = Depends(get_db), client=Depends(require_api_client)):
    rpt = db.execute(
        select(Report).where(Report.tenant_id == client.tenant_id, Report.id == report_id)
    ).scalars().first()
    if not rpt:
        raise HTTPException(status_code=404, detail="Report not found")

    text = render_report_text(rpt.template_id, rpt.report_json or {})
    rpt.report_text = text
    db.commit()

    return {"report_id": rpt.id, "status": rpt.status, "template_id": rpt.template_id}
