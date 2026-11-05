from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.action import ActionOrStr
from .rule_when import RuleWhen, RuleWhenDict


class Rule(SdkBaseModel):
    id: str
    action: ActionOrStr
    when: RuleWhen
    source: Optional[str] = UNSET


class RuleDict(TypedDict):
    id: str
    action: ActionOrStr
    when: RuleWhenDict
    source: NotRequired[str]
