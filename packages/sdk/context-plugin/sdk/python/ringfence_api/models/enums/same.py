from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Same(str, Enum):
    REFERRER = "referrer"

    __str__ = str.__str__


SameOrStr: TypeAlias = Annotated[Same | str, open_enum_validator(Same)]
