from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .rule import Rule, RuleDict


class ProposeRuleRequest(SdkBaseModel):
    rule: Rule
    source: Optional[str] = UNSET


class ProposeRuleRequestDict(TypedDict):
    rule: RuleDict
    source: NotRequired[str]
