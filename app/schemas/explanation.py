from pydantic import BaseModel


class ExplanationCreateOut(BaseModel):
    explanation_id: str
    status: str


class ExplanationOut(BaseModel):
    explanation_id: str
    status: str
    method: str
    evidence: dict
    error: str | None
