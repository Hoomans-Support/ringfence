from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class SenderBatchHeader(SdkBaseModel):
    sender_batch_id: str
    email_subject: Optional[str] = UNSET


class SenderBatchHeaderDict(TypedDict):
    sender_batch_id: str
    email_subject: NotRequired[str]
