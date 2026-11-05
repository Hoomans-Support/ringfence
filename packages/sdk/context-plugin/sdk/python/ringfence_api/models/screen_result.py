from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .item_decision import ItemDecision, ItemDecisionDict
from .screen_summary import ScreenSummary, ScreenSummaryDict


class ScreenResult(SdkBaseModel):
    rule_set_version: Optional[str] = UNSET
    summary: Optional[ScreenSummary] = UNSET
    decisions: Optional[list[ItemDecision]] = UNSET


class ScreenResultDict(TypedDict):
    rule_set_version: NotRequired[str]
    summary: NotRequired[ScreenSummaryDict]
    decisions: NotRequired[list[ItemDecisionDict]]
