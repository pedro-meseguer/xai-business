from datetime import datetime
from pydantic import BaseModel


class ReportCreateIn(BaseModel):
    decision_event_id: str
    explanation_id: str
    template_id: str = "generic_v1"


class ReportCreateOut(BaseModel):
    report_id: str
    status: str


class ReportOut(BaseModel):
    report_id: str
    status: str
    template_id: str
    version: int          # <-- AÑADE ESTO
    report_json: dict
    report_text: str | None


class ReportListItem(BaseModel):
    report_id: str
    status: str
    template_id: str
    decision_event_id: str
    explanation_id: str
    created_at: datetime

    decision_id: str
    occurred_at: datetime
    decision_label: str | None = None
    version: int


class ReportListOut(BaseModel):
    total: int
    items: list[ReportListItem]
    offset: int
    limit: int

from pydantic import BaseModel
from app.schemas.ui_blocks_v1 import Section

class ReportUpdateIn(BaseModel):
    sections: list[Section] | None = None
    expected_version: int