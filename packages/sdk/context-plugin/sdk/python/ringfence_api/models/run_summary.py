from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class RunSummary(SdkBaseModel):
    paid: Optional[int] = UNSET
    held: Optional[int] = UNSET
    blocked: Optional[int] = UNSET
    paid_usd: Optional[float] = UNSET
    held_usd: Optional[float] = UNSET
    blocked_usd: Optional[float] = UNSET


class RunSummaryDict(TypedDict):
    paid: NotRequired[int]
    held: NotRequired[int]
    blocked: NotRequired[int]
    paid_usd: NotRequired[float]
    held_usd: NotRequired[float]
    blocked_usd: NotRequired[float]
