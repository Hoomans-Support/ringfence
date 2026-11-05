from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, SdkBaseModel


class ReleaseResponse(SdkBaseModel):
    sender_batch_id: Optional[str] = UNSET
    released: Optional[list[str]] = UNSET
    created: Optional[bool] = UNSET
    payout_batch_id: OptionalNullable[str] = UNSET
    batch_status: OptionalNullable[str] = UNSET


class ReleaseResponseDict(TypedDict):
    sender_batch_id: NotRequired[str]
    released: NotRequired[list[str]]
    created: NotRequired[bool]
    payout_batch_id: NotRequired[str | None]
    batch_status: NotRequired[str | None]
