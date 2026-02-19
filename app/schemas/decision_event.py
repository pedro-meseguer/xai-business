from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ModelInfo(BaseModel):
    model_id: str
    model_version: str


class ModelOutput(BaseModel):
    data: dict = Field(default_factory=dict)


class DecisionInfo(BaseModel):
    data: dict = Field(default_factory=dict)


class DecisionEventIn(BaseModel):
    decision_id: str
    occurred_at: datetime
    model: ModelInfo
    input_features: dict
    model_output: dict
    final_decision: FinalDecisionIn
    idempotency_key: str


class DecisionEventOut(BaseModel):
    event_id: str
    created: bool


class FinalDecisionIn(BaseModel):
    # Permite campos extra (p.ej. score, reason_code, raw, etc.)
    model_config = ConfigDict(extra="allow")

    label: str = Field(min_length=1)
