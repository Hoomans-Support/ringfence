// Builds the resources/events Bryntum needs for the ring detail timeline. Pulled out of
// page.tsx so the naming (which must agree between a row and its own bar - see the
// account_id -> "Account NN" map below) is one function, testable without rendering the page.
import type { PayoutRun, RingSummary } from "@ringfence/engine";
import type { PositionedNode } from "./graph-layout";

export interface TimelineResource {
  id: string;
  name: string;
}

export interface TimelineEvent {
  id: string;
  resourceId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function buildRingTimelineData(
  ring: RingSummary,
  run: PayoutRun,
  nodes: PositionedNode[],
  payoutAt: string,
): { resources: TimelineResource[]; events: TimelineEvent[] } {
  const memberIds = new Set(ring.member_sender_item_ids);
  // One name per account_id, in the graph's own node order, shared by resources and events
  // so a row and the bar inside it always show the same account number.
  const accountNameByAccountId = new Map(nodes.map((node, index) => [node.id, `Account ${String(index + 1).padStart(2, "0")}`] as const));

  const events: TimelineEvent[] = run.items
    .filter((item) => memberIds.has(item.sender_item_id))
    .map((item) => ({
      id: item.sender_item_id,
      resourceId: item.context.account_id,
      name: accountNameByAccountId.get(item.context.account_id) ?? item.context.account_id,
      startDate: item.context.signup_at,
      endDate: payoutAt,
    }));

  const resources: TimelineResource[] = nodes.map((node) => ({
    id: node.id,
    name: accountNameByAccountId.get(node.id)!,
  }));

  return { resources, events };
}
