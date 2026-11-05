from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.webhook_rejected import WebhookRejected

ReceivePaypalWebhookErrorBody: TypeAlias = WebhookRejected | RawError


@dataclass(frozen=True, slots=True)
class _ReceivePaypalWebhookError:
    def map(self, status_code: int, content: bytes) -> ReceivePaypalWebhookErrorBody:
        match status_code:
            case 400:
                return decode_json[WebhookRejected](content)
            case _:
                return RawError(status_code, content)


receive_paypal_webhook_error_mapper: Final[ErrorMapper[ReceivePaypalWebhookErrorBody]] = _ReceivePaypalWebhookError()
