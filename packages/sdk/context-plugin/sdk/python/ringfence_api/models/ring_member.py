from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class RingMember(SdkBaseModel):
    sender_item_id: Optional[str] = UNSET
    payee: Optional[str] = UNSET
    """Masked, never the real address"""

    state: Optional[str] = UNSET


class RingMemberDict(TypedDict):
    sender_item_id: NotRequired[str]
    payee: NotRequired[str]
    state: NotRequired[str]
