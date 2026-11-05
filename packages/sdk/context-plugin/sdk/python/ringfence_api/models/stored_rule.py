from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, RFC3339DateTime, SdkBaseModel
from .backtest_result import BacktestResult, BacktestResultDict
from .enums.status import StatusOrStr
from .red_team_result import RedTeamResult, RedTeamResultDict
from .rule import Rule, RuleDict


class StoredRule(SdkBaseModel):
    rule_id: Optional[str] = UNSET
    version: Optional[int] = UNSET
    body: Optional[Rule] = UNSET
    source: OptionalNullable[str] = UNSET
    status: Optional[StatusOrStr] = UNSET
    backtest: OptionalNullable[BacktestResult] = UNSET
    red_team: OptionalNullable[RedTeamResult] = UNSET
    flags: Optional[list[str]] = UNSET
    """e.g. "holds_over_5_percent" — needs ``acknowledge_flags`` to approve."""

    approved_by: OptionalNullable[str] = UNSET
    approved_at: OptionalNullable[RFC3339DateTime] = UNSET


class StoredRuleDict(TypedDict):
    rule_id: NotRequired[str]
    version: NotRequired[int]
    body: NotRequired[RuleDict]
    source: NotRequired[str | None]
    status: NotRequired[StatusOrStr]
    backtest: NotRequired[BacktestResultDict | None]
    red_team: NotRequired[RedTeamResultDict | None]
    flags: NotRequired[list[str]]
    approved_by: NotRequired[str | None]
    approved_at: NotRequired[RFC3339DateTime | None]
