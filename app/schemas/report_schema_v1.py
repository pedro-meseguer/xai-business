from __future__ import annotations

from datetime import datetime
from typing import Literal
from app.schemas.ui_blocks_v1 import Section
from app.schemas.evidence_v1 import EvidenceItem
from pydantic import BaseModel, Field, ConfigDict


class ModelInfo(BaseModel):
    model_id: str
    model_version: str


class MainFactor(BaseModel):
    feature: str
    direction: Literal["positive", "negative", "unknown"] = "unknown"
    importance: float = Field(ge=0.0)


class ExplanationEvidence(BaseModel):
    type: str = "stub"
    main_factors: list[MainFactor] = Field(default_factory=list)


class Facts(BaseModel):
    decision_id: str
    occurred_at: datetime
    model: ModelInfo
    final_decision: dict


class ReportSchemaV1(BaseModel):
    model_config = ConfigDict(extra="forbid")  # evita que se “cuelen” campos sin control

    schema_version: Literal["1.0"] = "1.0"
    template_id: str = "generic_v1"
    decision_event_id: str
    explanation_id: str

    facts: Facts
    explanation: ExplanationEvidence

    sections: list[Section] = Field(default_factory=list)
    evidence_items: list[EvidenceItem] = Field(default_factory=list)