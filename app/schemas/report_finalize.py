from pydantic import BaseModel

class ReportFinalizeIn(BaseModel):
    expected_version: int