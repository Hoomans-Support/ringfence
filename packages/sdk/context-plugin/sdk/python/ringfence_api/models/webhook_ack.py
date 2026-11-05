from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class WebhookAck(SdkBaseModel):
    ok: Optional[bool] = UNSET
    outcome: Optional[str] = UNSET


class WebhookAckDict(TypedDict):
    ok: NotRequired[bool]
    outcome: NotRequired[str]
