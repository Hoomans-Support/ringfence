from __future__ import annotations

from typing import Literal

from pydantic import EmailStr
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .payout_item_context import PayoutItemContext, PayoutItemContextDict


class PayoutItemRequest(SdkBaseModel):
    recipient_type: Literal["EMAIL"] = "EMAIL"
    receiver: EmailStr
    amount: Money
    sender_item_id: str
    context: Optional[PayoutItemContext] = UNSET
    """Ringfence's addition to PayPal's own Payouts item; stripped before the batch goes to PayPal."""


class PayoutItemRequestDict(TypedDict):
    recipient_type: Literal["EMAIL"]
    receiver: EmailStr
    amount: MoneyDict
    sender_item_id: str
    context: NotRequired[PayoutItemContextDict]
