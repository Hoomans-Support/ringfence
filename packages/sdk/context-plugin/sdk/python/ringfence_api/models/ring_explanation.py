from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .case_file import CaseFile, CaseFileDict
from .ring_member import RingMember, RingMemberDict


class RingExplanation(SdkBaseModel):
    ring_id: Optional[str] = UNSET
    run_id: Optional[str] = UNSET
    size: Optional[int] = UNSET
    reasons: Optional[list[str]] = UNSET
    rules: Optional[list[str]] = UNSET
    members: Optional[list[RingMember]] = UNSET
    case_file: Optional[CaseFile] = UNSET


class RingExplanationDict(TypedDict):
    ring_id: NotRequired[str]
    run_id: NotRequired[str]
    size: NotRequired[int]
    reasons: NotRequired[list[str]]
    rules: NotRequired[list[str]]
    members: NotRequired[list[RingMemberDict]]
    case_file: NotRequired[CaseFileDict]
