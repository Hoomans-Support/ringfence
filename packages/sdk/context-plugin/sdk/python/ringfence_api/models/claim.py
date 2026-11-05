from __future__ import annotations

from typing import Any

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class Claim(SdkBaseModel):
    text: Optional[str] = UNSET
    evidence: Optional[Any] = UNSET


class ClaimDict(TypedDict):
    text: NotRequired[str]
    evidence: NotRequired[Any]
