from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

ScreenPayeesErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _ScreenPayeesError:
    def map(self, status_code: int, content: bytes) -> ScreenPayeesErrorBody:
        match status_code:
            case 400 | 401:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


screen_payees_error_mapper: Final[ErrorMapper[ScreenPayeesErrorBody]] = _ScreenPayeesError()
