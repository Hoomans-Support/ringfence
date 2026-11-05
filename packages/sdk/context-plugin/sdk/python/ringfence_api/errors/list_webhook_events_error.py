from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

ListWebhookEventsErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _ListWebhookEventsError:
    def map(self, status_code: int, content: bytes) -> ListWebhookEventsErrorBody:
        match status_code:
            case 404:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


list_webhook_events_error_mapper: Final[ErrorMapper[ListWebhookEventsErrorBody]] = _ListWebhookEventsError()
