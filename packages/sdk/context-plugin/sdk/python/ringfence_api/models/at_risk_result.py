from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .at_risk_ring import AtRiskRing, AtRiskRingDict
from .held_account import HeldAccount, HeldAccountDict


class AtRiskResult(SdkBaseModel):
    checked: Optional[int] = UNSET
    rings: Optional[list[AtRiskRing]] = UNSET
    held: Optional[list[HeldAccount]] = UNSET


class AtRiskResultDict(TypedDict):
    checked: NotRequired[int]
    rings: NotRequired[list[AtRiskRingDict]]
    held: NotRequired[list[HeldAccountDict]]
