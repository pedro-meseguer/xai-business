from sqlalchemy.orm import Session
from app.models.report_revision import ReportRevision

def add_revision(
    db: Session,
    *,
    tenant_id: str,
    report_id: str,
    version: int,
    action: str,
    report_json: dict,
    created_by_client_id: str | None,
) -> None:
    obj = ReportRevision(
        tenant_id=tenant_id,
        report_id=report_id,
        version=version,
        action=action,
        report_json=report_json,
        created_by_client_id=created_by_client_id,
    )
    db.add(obj)
