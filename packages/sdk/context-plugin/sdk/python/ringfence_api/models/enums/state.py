from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class State(str, Enum):
    HELD = "held"
    BLOCKED = "blocked"
    QUEUED = "queued"
    SENT = "sent"
    PAID = "paid"
    UNCLAIMED = "unclaimed"
    RETURNED = "returned"
    FAILED = "failed"

    __str__ = str.__str__


StateOrStr: TypeAlias = Annotated[State | str, open_enum_validator(State)]
