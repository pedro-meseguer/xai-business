from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: Literal["main_factor"] = "main_factor"
    payload: dict
