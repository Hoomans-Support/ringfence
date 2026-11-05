from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .rule_condition import RuleCondition, RuleConditionDict


class RuleWhen(SdkBaseModel):
    all: list[RuleCondition]


class RuleWhenDict(TypedDict):
    all: list[RuleConditionDict]
