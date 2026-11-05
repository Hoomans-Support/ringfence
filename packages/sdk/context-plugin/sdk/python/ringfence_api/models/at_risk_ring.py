from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class AtRiskRing(SdkBaseModel):
    ring_id: Optional[str] = UNSET
    member_sender_item_ids: Optional[list[str]] = UNSET
    size: Optional[int] = UNSET
    reasons: Optional[list[str]] = UNSET
    louvain_clusters: Optional[int] = UNSET


class AtRiskRingDict(TypedDict):
    ring_id: NotRequired[str]
    member_sender_item_ids: NotRequired[list[str]]
    size: NotRequired[int]
    reasons: NotRequired[list[str]]
    louvain_clusters: NotRequired[int]
