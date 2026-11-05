from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, RFC3339DateTime, SdkBaseModel


class WebhookEventLogEntry(SdkBaseModel):
    event_id: Optional[str] = UNSET
    event_type: Optional[str] = UNSET
    payout_batch_id: OptionalNullable[str] = UNSET
    transaction_status: OptionalNullable[str] = UNSET
    applied: Optional[bool] = UNSET
    received_at: Optional[RFC3339DateTime] = UNSET


class WebhookEventLogEntryDict(TypedDict):
    event_id: NotRequired[str]
    event_type: NotRequired[str]
    payout_batch_id: NotRequired[str | None]
    transaction_status: NotRequired[str | None]
    applied: NotRequired[bool]
    received_at: NotRequired[RFC3339DateTime]
