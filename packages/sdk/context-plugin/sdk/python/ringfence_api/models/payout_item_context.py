from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, RFC3339DateTime, SdkBaseModel


class PayoutItemContext(SdkBaseModel):
    """Ringfence's addition to PayPal's own Payouts item; stripped before the batch goes to PayPal."""

    account_id: Optional[str] = UNSET
    signup_at: Optional[RFC3339DateTime] = UNSET
    device_hash: Optional[str] = UNSET
    ip_prefix: Optional[str] = UNSET
    referrer_id: Optional[str] = UNSET
    answer: Optional[str] = UNSET
    onboarding_seconds: Optional[float] = UNSET
    """Seconds from signup to finishing onboarding. <=120 is the "speed" risk flag."""

    activity_after_onboarding: Optional[int] = UNSET
    """Count of actions after onboarding finished. 0 is the "quiet" risk flag."""


class PayoutItemContextDict(TypedDict):
    account_id: NotRequired[str]
    signup_at: NotRequired[RFC3339DateTime]
    device_hash: NotRequired[str]
    ip_prefix: NotRequired[str]
    referrer_id: NotRequired[str]
    answer: NotRequired[str]
    onboarding_seconds: NotRequired[float]
    activity_after_onboarding: NotRequired[int]
