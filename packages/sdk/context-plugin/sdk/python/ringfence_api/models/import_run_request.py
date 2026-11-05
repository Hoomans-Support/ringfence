from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .payout_item_request import PayoutItemRequest, PayoutItemRequestDict
from .sender_batch_header import SenderBatchHeader, SenderBatchHeaderDict


class ImportRunRequest(SdkBaseModel):
    sender_batch_header: SenderBatchHeader
    items: list[PayoutItemRequest]
    payout_batch_id: str


class ImportRunRequestDict(TypedDict):
    sender_batch_header: SenderBatchHeaderDict
    items: list[PayoutItemRequestDict]
    payout_batch_id: str
