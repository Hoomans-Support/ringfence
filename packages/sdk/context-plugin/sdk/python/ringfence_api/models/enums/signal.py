from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Signal(str, Enum):
    """``network_match`` also exists but is a fixed starter signal (S-03) only, never proposable — a proposed rule
    naming it fails the schema check as an unknown signal."""

    SIGNUP_BURST = "signup_burst"
    ONBOARDING_SECONDS = "onboarding_seconds"
    ACTIVITY_AFTER_ONBOARDING = "activity_after_onboarding"
    DISPOSABLE_EMAIL = "disposable_email"
    GRAPH_COMMUNITY = "graph_community"
    KNOWN_FRAUD = "known_fraud"

    __str__ = str.__str__


SignalOrStr: TypeAlias = Annotated[Signal | str, open_enum_validator(Signal)]
