from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

ReleaseHoldsErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _ReleaseHoldsError:
    def map(self, status_code: int, content: bytes) -> ReleaseHoldsErrorBody:
        match status_code:
            case 400 | 401 | 409:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


release_holds_error_mapper: Final[ErrorMapper[ReleaseHoldsErrorBody]] = _ReleaseHoldsError()
