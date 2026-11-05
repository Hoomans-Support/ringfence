from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.decision import DecisionOrStr
from .enums.state import StateOrStr


class ItemDecision(SdkBaseModel):
    sender_item_id: Optional[str] = UNSET
    decision: Optional[DecisionOrStr] = UNSET
    state: Optional[StateOrStr] = UNSET
    ring_id: Optional[str] = UNSET
    """Set only for communities of 3+"""

    hold_group_id: Optional[str] = UNSET
    """Set for any held group, ring or pair"""

    reasons: Optional[list[str]] = UNSET
    rules: Optional[list[str]] = UNSET


class ItemDecisionDict(TypedDict):
    sender_item_id: NotRequired[str]
    decision: NotRequired[DecisionOrStr]
    state: NotRequired[StateOrStr]
    ring_id: NotRequired[str]
    hold_group_id: NotRequired[str]
    reasons: NotRequired[list[str]]
    rules: NotRequired[list[str]]
