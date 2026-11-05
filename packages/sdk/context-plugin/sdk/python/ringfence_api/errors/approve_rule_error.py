from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

ApproveRuleErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _ApproveRuleError:
    def map(self, status_code: int, content: bytes) -> ApproveRuleErrorBody:
        match status_code:
            case 401 | 404 | 409:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


approve_rule_error_mapper: Final[ErrorMapper[ApproveRuleErrorBody]] = _ApproveRuleError()
