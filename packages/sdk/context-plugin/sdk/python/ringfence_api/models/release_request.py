from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ReleaseRequest(SdkBaseModel):
    """Give ``sender_item_ids``, ``hold_group_id``, or both."""

    run_id: str
    sender_item_ids: Optional[list[str]] = UNSET
    hold_group_id: Optional[str] = UNSET
    released_by: Optional[str] = UNSET


class ReleaseRequestDict(TypedDict):
    run_id: str
    sender_item_ids: NotRequired[list[str]]
    hold_group_id: NotRequired[str]
    released_by: NotRequired[str]
