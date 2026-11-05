from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Outcome(str, Enum):
    UNVERIFIED = "unverified"

    __str__ = str.__str__


OutcomeOrStr: TypeAlias = Annotated[Outcome | str, open_enum_validator(Outcome)]
