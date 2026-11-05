from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Money(SdkBaseModel):
    value: str
    currency: str


class MoneyDict(TypedDict):
    value: str
    currency: str
