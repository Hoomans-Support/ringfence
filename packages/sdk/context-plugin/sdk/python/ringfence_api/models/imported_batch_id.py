from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ImportedBatchId(SdkBaseModel):
    payout_batch_id: str


class ImportedBatchIdDict(TypedDict):
    payout_batch_id: str
