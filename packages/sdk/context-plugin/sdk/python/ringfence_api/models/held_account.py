from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class HeldAccount(SdkBaseModel):
    account_id: Optional[str] = UNSET
    ring_id: Optional[str] = UNSET
    hold_group_id: Optional[str] = UNSET
    reasons: Optional[list[str]] = UNSET


class HeldAccountDict(TypedDict):
    account_id: NotRequired[str]
    ring_id: NotRequired[str]
    hold_group_id: NotRequired[str]
    reasons: NotRequired[list[str]]
