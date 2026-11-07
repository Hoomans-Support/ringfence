// The control tower's ring-graph widget: a ring's real members and edges (the engine's own graph,
// not a redrawn approximation), laid out by computeLayout once the widget knows its size.
import { buildGraph, type PayoutItem, type PayoutRun, type RingSummary } from "@ringfence/engine";
import type { LayoutLink } from "./graph-layout";

export interface RingGraphData {
  nodeIds: string[];
  links: LayoutLink[];
  operatorIds: Set<string>;
}

/** The ring's real members, edges and operator - everything layoutRing computes except the actual
 *  x/y positions. Split out so a caller that can only know its real pixel size on the client (the
 *  control tower's widget, sized by its own container via ResizeObserver) can run computeLayout
 *  itself once it knows that size, instead of getting a layout baked in at a guessed size. */
export function buildRingGraphData(ring: RingSummary, run: PayoutRun): RingGraphData {
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

  return { nodeIds: [...memberAccountIds], links, operatorIds };
}
