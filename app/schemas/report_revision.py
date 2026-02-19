from datetime import datetime
from pydantic import BaseModel

class ReportRevisionItem(BaseModel):
    id: str
    version: int
    action: str
    created_at: datetime
    created_by_client_id: str | None

class ReportRevisionListOut(BaseModel):
    total: int
    items: list[ReportRevisionItem]
    offset: int
    limit: int
