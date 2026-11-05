from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .claim import Claim, ClaimDict


class CaseFile(SdkBaseModel):
    claims_checked: Optional[str] = UNSET
    claims: Optional[list[Claim]] = UNSET


class CaseFileDict(TypedDict):
    claims_checked: NotRequired[str]
    claims: NotRequired[list[ClaimDict]]
