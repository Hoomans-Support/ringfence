from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .payout_item_request import PayoutItemRequest, PayoutItemRequestDict
from .sender_batch_header import SenderBatchHeader, SenderBatchHeaderDict


class RunRequest(SdkBaseModel):
    sender_batch_header: SenderBatchHeader
    items: list[PayoutItemRequest]


class RunRequestDict(TypedDict):
    sender_batch_header: SenderBatchHeaderDict
    items: list[PayoutItemRequestDict]
