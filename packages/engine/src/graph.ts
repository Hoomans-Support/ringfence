/**
 * Graph engine (FR-3): a weighted graph of accounts and what they share,
 * split into communities with Louvain. Only four signals form edges — hard
 * links (shared payout address, shared device) weigh 1.0, soft links
 * (email alias pattern, IP neighborhood within 30 minutes) weigh 0.35 each,
 * and the weights between any one pair are summed before a 0.5 floor is
 * applied, so one soft link alone never joins two accounts (0.35 < 0.5) but
 * two soft links together do (0.70 >= 0.5).
 *
 * Signup burst and similar answers are rule features, not graph edges (see
 * final-prd.docx's signals table) — that is deliberate: it keeps coworkers
 * who pasted the same sentence from being graph-linked to each other, so
 * they come out paid unless a later rule (A's rule engine) holds them on
 * other grounds.
 */
import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { aliasPatternKey, normalizeEmail } from "./identity";
import type { PayoutItem } from "./types";

const HARD_WEIGHT = 1.0;
const SOFT_WEIGHT = 0.35;
export const EDGE_THRESHOLD = 0.5;
const IP_WINDOW_MINUTES = 30;

/**
 * A device or payout-address bucket bigger than this is far more likely to
 * be a shared public resource (a café tablet, a school computer lab) than
 * one operator's ring, so sharing it stops counting as a hard link above
 * this size — it still contributes a soft link, not nothing. Without this
 * guard a single busy device could hard-link dozens of unrelated people
 * into one connected component. 12 clears our largest seeded ring's own
 * per-device share (23 accounts / 3 devices ≈ 8) with headroom.
 */
const MAX_HARD_LINK_BUCKET = 12;

interface LinkContribution {
  weight: number;
  hard: boolean;
  reason: string;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function bucketBy<T>(items: T[], keyOf: (item: T) => string | undefined): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return buckets;
}

function addContribution(
  contributions: Map<string, LinkContribution[]>,
  a: string,
  b: string,
  weight: number,
  hard: boolean,
  reason: string,
): void {
  if (a === b) return;
  const key = edgeKey(a, b);
  const list = contributions.get(key);
  if (list) list.push({ weight, hard, reason });
  else contributions.set(key, [{ weight, hard, reason }]);
}

export interface GraphBuildResult {
  graph: Graph;
  /** account id -> (other account id -> reasons that formed the surviving edge between them) */
  linkReasons: Map<string, Map<string, string[]>>;
}

export function buildGraph(items: PayoutItem[]): GraphBuildResult {
  const graph = new Graph({ type: "undirected" });
  for (const item of items) graph.mergeNode(item.context.account_id);

  const contributions = new Map<string, LinkContribution[]>();

  function connectAllPairs(group: PayoutItem[], weight: number, hard: boolean, reason: string): void {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const left = group[i];
        const right = group[j];
        if (!left || !right) continue;
        addContribution(contributions, left.context.account_id, right.context.account_id, weight, hard, reason);
      }
    }
  }

  // Hard link: shared payout address (same normalized receiver email) —
  // demoted to a soft link if the bucket is implausibly large (see
  // MAX_HARD_LINK_BUCKET).
  for (const group of bucketBy(items, (it) => normalizeEmail(it.receiver).email).values()) {
    if (group.length < 2) continue;
    const oversized = group.length > MAX_HARD_LINK_BUCKET;
    connectAllPairs(group, oversized ? SOFT_WEIGHT : HARD_WEIGHT, !oversized, "shared_payout_address");
  }

  // Hard link: shared device — same demotion for an oversized bucket.
  for (const [deviceHash, group] of bucketBy(items, (it) => it.context.device_hash)) {
    if (group.length < 2) continue;
    const oversized = group.length > MAX_HARD_LINK_BUCKET;
    connectAllPairs(group, oversized ? SOFT_WEIGHT : HARD_WEIGHT, !oversized, `shared_device:${deviceHash}`);
  }

  // Soft link: email alias pattern.
  for (const group of bucketBy(items, (it) => aliasPatternKey(it.receiver)).values()) {
    if (group.length > 1) connectAllPairs(group, SOFT_WEIGHT, false, "alias_pattern");
  }

  // Soft link: IP neighborhood within 30 minutes. Sorted by signup time so
  // the inner loop can stop as soon as a pair falls outside the window.
  for (const group of bucketBy(items, (it) => it.context.ip_prefix).values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => new Date(a.context.signup_at).getTime() - new Date(b.context.signup_at).getTime(),
    );
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const left = sorted[i];
        const right = sorted[j];
        if (!left || !right) continue;
        const diffMin = Math.abs(new Date(right.context.signup_at).getTime() - new Date(left.context.signup_at).getTime()) / 60000;
        if (diffMin > IP_WINDOW_MINUTES) break;
        addContribution(contributions, left.context.account_id, right.context.account_id, SOFT_WEIGHT, false, "ip_neighborhood");
      }
    }
  }

  const linkReasons = new Map<string, Map<string, string[]>>();
  function recordReason(a: string, b: string, reason: string): void {
    let inner = linkReasons.get(a);
    if (!inner) {
      inner = new Map<string, string[]>();
      linkReasons.set(a, inner);
    }
    const list = inner.get(b);
    if (list) list.push(reason);
    else inner.set(b, [reason]);
  }

  for (const [key, list] of contributions) {
    const [a, b] = key.split("\u0000") as [string, string];
    const total = list.reduce((sum, c) => sum + c.weight, 0);
    if (total < EDGE_THRESHOLD) continue; // one soft link alone never joins two accounts
    const hard = list.some((c) => c.hard);
    graph.mergeEdge(a, b, { weight: total, hard });
    const reasons = [...new Set(list.map((c) => c.reason))];
    for (const reason of reasons) {
      recordReason(a, b, reason);
      recordReason(b, a, reason);
    }
  }

  return { graph, linkReasons };
}

/**
 * Account id -> connected-component id. This is the grouping scoreRun holds
 * or pays by: everyone reachable from everyone else through a surviving
 * edge is one group, so a ring split across several devices (linked back
 * together by a shared alias pattern or IP neighborhood) still comes out as
 * one group, and a lone account is always its own group of one.
 */
export function connectedComponents(graph: Graph): Map<string, string> {
  const result = new Map<string, string>();
  const visited = new Set<string>();
  let counter = 0;

  graph.forEachNode((start) => {
    if (visited.has(start)) return;
    const componentId = `cc:${counter}`;
    counter += 1;
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      result.set(current, componentId);
      graph.forEachNeighbor(current, (neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
  });

  return result;
}

/**
 * Account id -> Louvain community id, run over the same graph for
 * structural detail only (e.g. "this ring breaks into 3 device clusters"
 * in a case file) — not used to decide who is held. Modularity optimization
 * finds the *tightest* sub-structure, which is exactly what correctly
 * splits two unrelated, densely-linked crowds that happen to share one
 * over-shared hub; using it as the hold boundary would instead have split
 * a real multi-device ring into one group per device. Degree-0 nodes get a
 * community of their own.
 */
export function detectCommunities(graph: Graph): Map<string, string> {
  const result = new Map<string, string>();
  if (graph.order === 0) return result;

  const hasAnyEdge = graph.size > 0;
  const assignment = hasAnyEdge ? louvain(graph, { getEdgeWeight: "weight" }) : {};

  graph.forEachNode((node) => {
    if (graph.degree(node) === 0) {
      result.set(node, `isolated:${node}`);
    } else {
      result.set(node, `c:${assignment[node]}`);
    }
  });

  return result;
}

export function communityHasHardLink(graph: Graph, members: string[]): boolean {
  const memberSet = new Set(members);
  for (const accountId of members) {
    let found = false;
    graph.forEachEdge(accountId, (_edge, attrs, source, target) => {
      const other = source === accountId ? target : source;
      if (memberSet.has(other) && attrs.hard) found = true;
    });
    if (found) return true;
  }
  return false;
}
