from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.outcome import OutcomeOrStr


class WebhookRejectedError(SdkBaseModel):
    ok: Optional[bool] = UNSET
    outcome: Optional[OutcomeOrStr] = UNSET


class WebhookRejectedErrorDict(TypedDict):
    ok: NotRequired[bool]
    outcome: NotRequired[OutcomeOrStr]
