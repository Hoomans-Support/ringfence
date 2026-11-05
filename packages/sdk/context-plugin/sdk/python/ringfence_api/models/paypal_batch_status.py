from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, SdkBaseModel


class PaypalBatchStatus(SdkBaseModel):
    sender_batch_id: OptionalNullable[str] = UNSET
    payout_batch_id: OptionalNullable[str] = UNSET
    batch_status: OptionalNullable[str] = UNSET
    """PayPal's own status once sent; QUEUED or NOT_SENT before that."""

    error: Optional[str] = UNSET
    """PayPal's last refusal (e.g. INSUFFICIENT_FUNDS) while unsent"""


class PaypalBatchStatusDict(TypedDict):
    sender_batch_id: NotRequired[str | None]
    payout_batch_id: NotRequired[str | None]
    batch_status: NotRequired[str | None]
    error: NotRequired[str]
