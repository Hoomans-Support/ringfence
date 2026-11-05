from __future__ import annotations

from pydantic import EmailStr
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, RFC3339DateTime, SdkBaseModel


class SignupEvent(SdkBaseModel):
    account_id: str
    receiver: Optional[EmailStr] = UNSET
    signup_at: Optional[RFC3339DateTime] = UNSET
    device_hash: Optional[str] = UNSET
    ip_prefix: Optional[str] = UNSET
    referrer_id: Optional[str] = UNSET
    answer: Optional[str] = UNSET
    onboarding_seconds: Optional[float] = UNSET


class SignupEventDict(TypedDict):
    account_id: str
    receiver: NotRequired[EmailStr]
    signup_at: NotRequired[RFC3339DateTime]
    device_hash: NotRequired[str]
    ip_prefix: NotRequired[str]
    referrer_id: NotRequired[str]
    answer: NotRequired[str]
    onboarding_seconds: NotRequired[float]
