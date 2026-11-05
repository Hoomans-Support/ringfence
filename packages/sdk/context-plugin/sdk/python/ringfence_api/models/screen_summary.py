from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ScreenSummary(SdkBaseModel):
    pay: Optional[int] = UNSET
    hold: Optional[int] = UNSET
    block: Optional[int] = UNSET


class ScreenSummaryDict(TypedDict):
    pay: NotRequired[int]
    hold: NotRequired[int]
    block: NotRequired[int]
