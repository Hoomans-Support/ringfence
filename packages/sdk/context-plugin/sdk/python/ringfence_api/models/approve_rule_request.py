from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ApproveRuleRequest(SdkBaseModel):
    approved_by: str
    acknowledge_flags: Optional[bool] = UNSET
    """Required (true) to approve a rule that holds more than 5% of any past run."""


class ApproveRuleRequestDict(TypedDict):
    approved_by: str
    acknowledge_flags: NotRequired[bool]
