from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class BacktestResult(SdkBaseModel):
    weeks: Optional[int] = UNSET
    caught: Optional[int] = UNSET
    usd: Optional[float] = UNSET
    false_holds: Optional[int] = UNSET


class BacktestResultDict(TypedDict):
    weeks: NotRequired[int]
    caught: NotRequired[int]
    usd: NotRequired[float]
    false_holds: NotRequired[int]
