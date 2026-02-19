from __future__ import annotations

from typing import Annotated, Literal, Union
from pydantic import BaseModel, ConfigDict, Field


class TextBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["text"] = "text"
    text: str
    evidence_ids: list[str] = Field(default_factory=list)


class ListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    evidence_ids: list[str] = Field(default_factory=list)


class ListBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["list"] = "list"
    items: list[ListItem] = Field(default_factory=list)


UIBlock = Annotated[Union[TextBlock, ListBlock], Field(discriminator="type")]
# Pydantic elige el modelo correcto por el campo "type". [web:435]


class Section(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    blocks: list[UIBlock] = Field(default_factory=list)
