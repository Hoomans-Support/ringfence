from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class RedTeamResult(SdkBaseModel):
    """200 disguised copies of the ring this rule came from, 50 of them held out."""

    variants: Optional[int] = UNSET
    caught: Optional[int] = UNSET
    held_out: Optional[int] = UNSET
    held_out_caught: Optional[int] = UNSET
    misses: Optional[list[str]] = UNSET


class RedTeamResultDict(TypedDict):
    variants: NotRequired[int]
    caught: NotRequired[int]
    held_out: NotRequired[int]
    held_out_caught: NotRequired[int]
    misses: NotRequired[list[str]]
