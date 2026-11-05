from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

RecordEventErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _RecordEventError:
    def map(self, status_code: int, content: bytes) -> RecordEventErrorBody:
        match status_code:
            case 400 | 401:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


record_event_error_mapper: Final[ErrorMapper[RecordEventErrorBody]] = _RecordEventError()
