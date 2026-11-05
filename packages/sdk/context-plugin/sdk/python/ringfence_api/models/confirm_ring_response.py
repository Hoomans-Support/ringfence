from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ConfirmRingResponse(SdkBaseModel):
    ring_id: Optional[str] = UNSET
    blocked: Optional[int] = UNSET
    devices: Optional[int] = UNSET
    payout_addresses: Optional[int] = UNSET
    cancels_queued: Optional[int] = UNSET
    cancel_usd: Optional[float] = UNSET


class ConfirmRingResponseDict(TypedDict):
    ring_id: NotRequired[str]
    blocked: NotRequired[int]
    devices: NotRequired[int]
    payout_addresses: NotRequired[int]
    cancels_queued: NotRequired[int]
    cancel_usd: NotRequired[float]
