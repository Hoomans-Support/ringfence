// Shared by the ring detail page and the control tower's ring-graph widget: lays out a ring's real
// members and edges (the engine's own graph, not a redrawn approximation) ready for <RingGraph>.
import { buildGraph, type PayoutItem, type PayoutRun, type RingSummary } from "@ringfence/engine";
import { computeLayout, type LayoutLink, type PositionedNode } from "./graph-layout";

export interface RingLayout {
  nodes: PositionedNode[];
  links: LayoutLink[];
  operatorIds: Set<string>;
}

export function layoutRing(ring: RingSummary, run: PayoutRun, size: { width: number; height: number }): RingLayout {
  const bySenderItemId = new Map(run.items.map((it) => [it.sender_item_id, it] as const));
  const members: PayoutItem[] = ring.member_sender_item_ids
    .map((id) => bySenderItemId.get(id))
    .filter((x): x is PayoutItem => Boolean(x));
  const memberAccountIds = new Set(members.map((it) => it.context.account_id));

  const { graph } = buildGraph(run.items);
  const links: LayoutLink[] = [];
  graph.forEachEdge((_edge, _attrs, source, target) => {
    if (memberAccountIds.has(source) && memberAccountIds.has(target)) links.push({ source, target });
  });

  // The operator: whichever device the most members share (see ring-graph.tsx for the caveat on
  // this standing in for design.md's broader "shared signal" operator concept).
  const countByDevice = new Map<string, number>();
  for (const it of members) countByDevice.set(it.context.device_hash, (countByDevice.get(it.context.device_hash) ?? 0) + 1);
  const topDevice = [...countByDevice.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const operatorIds = new Set(members.filter((it) => it.context.device_hash === topDevice).map((it) => it.context.account_id));

  const layout = computeLayout([...memberAccountIds], links, size);
  return { nodes: layout.nodes, links: layout.links, operatorIds };
}
