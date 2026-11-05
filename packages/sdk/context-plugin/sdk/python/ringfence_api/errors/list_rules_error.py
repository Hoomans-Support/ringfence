from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

ListRulesErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _ListRulesError:
    def map(self, status_code: int, content: bytes) -> ListRulesErrorBody:
        match status_code:
            case 401:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


list_rules_error_mapper: Final[ErrorMapper[ListRulesErrorBody]] = _ListRulesError()
