from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .item_decision import ItemDecision, ItemDecisionDict
from .paypal_batch_status import PaypalBatchStatus, PaypalBatchStatusDict
from .run_summary import RunSummary, RunSummaryDict


class RunResponse(SdkBaseModel):
    run_id: Optional[str] = UNSET
    rule_set_version: Optional[str] = UNSET
    summary: Optional[RunSummary] = UNSET
    paypal: Optional[PaypalBatchStatus] = UNSET
    decisions: Optional[list[ItemDecision]] = UNSET


class RunResponseDict(TypedDict):
    run_id: NotRequired[str]
    rule_set_version: NotRequired[str]
    summary: NotRequired[RunSummaryDict]
    paypal: NotRequired[PaypalBatchStatusDict]
    decisions: NotRequired[list[ItemDecisionDict]]
