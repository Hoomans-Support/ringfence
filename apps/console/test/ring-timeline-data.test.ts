import { describe, expect, it } from "vitest";
import type { PayoutItem, PayoutRun, RingSummary } from "@ringfence/engine";
import type { PositionedNode } from "../lib/graph-layout";
import { buildRingTimelineData } from "../lib/ring-timeline-data";

function item(senderItemId: string, accountId: string, signupAt: string): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver: `${accountId}@example.com`,
    amount: { value: "10.00", currency: "USD" },
    sender_item_id: senderItemId,
    context: { account_id: accountId, signup_at: signupAt, device_hash: "d1", ip_prefix: "10.0.0.0/24" },
  };
}

describe("buildRingTimelineData", () => {
  it("gives a resource and its own events the same name, even when node order and item order differ", () => {
    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "b1" },
      // Payout-batch order: s3, s1, s2 - deliberately not the graph's node order below.
      items: [
        item("s3", "acc-3", "2026-11-02T09:02:00Z"),
        item("s1", "acc-1", "2026-11-02T09:00:00Z"),
        item("s2", "acc-2", "2026-11-02T09:01:00Z"),
      ],
    };
    const ring: RingSummary = {
      ring_id: "R-01",
      member_sender_item_ids: ["s1", "s2", "s3"],
      size: 3,
      reasons: [],
      louvain_clusters: 1,
    };
    // Graph-layout order: acc-1, acc-2, acc-3 - the order the row headers must follow.
    const nodes: PositionedNode[] = [
      { id: "acc-1", x: 0, y: 0 },
      { id: "acc-2", x: 1, y: 0 },
      { id: "acc-3", x: 2, y: 0 },
    ];

    const { resources, events } = buildRingTimelineData(ring, run, nodes, "2026-11-09T09:00:00Z");

    const nameByResourceId = new Map(resources.map((r) => [r.id, r.name]));
    for (const event of events) {
      expect(event.name).toBe(nameByResourceId.get(event.resourceId));
    }
    expect(resources.map((r) => r.name)).toEqual(["Account 01", "Account 02", "Account 03"]);
  });
});
