from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error

ImportPayoutRunErrorBody: TypeAlias = Error | RawError


@dataclass(frozen=True, slots=True)
class _ImportPayoutRunError:
    def map(self, status_code: int, content: bytes) -> ImportPayoutRunErrorBody:
        match status_code:
            case 400 | 401 | 409:
                return decode_json[Error](content)
            case _:
                return RawError(status_code, content)


import_payout_run_error_mapper: Final[ErrorMapper[ImportPayoutRunErrorBody]] = _ImportPayoutRunError()
