from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.same import SameOrStr
from .enums.signal import SignalOrStr


class RuleCondition(SdkBaseModel):
    signal: SignalOrStr
    """``network_match`` also exists but is a fixed starter signal (S-03) only, never proposable — a proposed rule
    naming it fails the schema check as an unknown signal."""

    same: Optional[SameOrStr] = UNSET
    window_min: Optional[float] = UNSET
    min_accounts: Optional[float] = UNSET
    max: Optional[float] = UNSET
    min: Optional[float] = UNSET


class RuleConditionDict(TypedDict):
    signal: SignalOrStr
    same: NotRequired[SameOrStr]
    window_min: NotRequired[float]
    min_accounts: NotRequired[float]
    max: NotRequired[float]
    min: NotRequired[float]
