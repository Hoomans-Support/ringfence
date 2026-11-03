import type { Metadata } from "next";
import { connection } from "next/server";
import { scoreRun } from "@ringfence/engine";
import { loadWeek1Run, loadWeek1Truth } from "@/lib/fixtures";
import { prettifyReason } from "@/lib/reasons";
import { ReviewGrid, type ReviewRow } from "./data-grid";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage() {
  await connection();

  const run = loadWeek1Run();
  const truth = loadWeek1Truth();
  const { decisions, rings } = scoreRun(run);

  const itemById = new Map(run.items.map((item) => [item.sender_item_id, item]));
  const accountBySenderItemId = new Map(run.items.map((item) => [item.sender_item_id, item.context.account_id]));

  // The engine assigns its own sequential ring ids (R-01, R-02...). The narrative label (e.g.
  // "R-12") lives in the ground-truth fixture, keyed by account, not by the engine's id — join
  // them so the console shows the story's label, per the task board's "held under ring R-12".
  function narrativeLabel(ringId: string | undefined, memberSenderItemIds: string[]): string | undefined {
    if (!ringId) return undefined;
    const memberAccountIds = new Set(
      memberSenderItemIds.map((id) => accountBySenderItemId.get(id)).filter((x): x is string => Boolean(x)),
    );
    const match = truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label);
    return match?.ring_label ?? ringId;
  }

  const ringLabelById = new Map(rings.map((r) => [r.ring_id, narrativeLabel(r.ring_id, r.member_sender_item_ids)]));

  const held = decisions.filter((d) => d.decision === "HOLD");

  const rows: ReviewRow[] = held
    .map((d): ReviewRow | undefined => {
      const item = itemById.get(d.sender_item_id);
      if (!item) return undefined;
      const group = d.ring_id ? (ringLabelById.get(d.ring_id) ?? d.ring_id) : (d.hold_group_id ?? "—");
      return {
        group,
        kind: d.ring_id ? "ring" : "pair",
        senderItemId: d.sender_item_id,
        receiver: item.receiver,
        amount: Number(item.amount.value),
        reasons: d.reasons.map(prettifyReason).join(" · "),
      };
    })
    .filter((r): r is ReviewRow => Boolean(r))
    .sort((a, b) => a.group.localeCompare(b.group) || a.senderItemId.localeCompare(b.senderItemId));

  const ringGroups = new Map<string, number>();
  const pairGroups = new Set<string>();
  for (const row of rows) {
    if (row.kind === "ring") ringGroups.set(row.group, (ringGroups.get(row.group) ?? 0) + 1);
    else pairGroups.add(row.group);
  }

  const paidCount = decisions.length - held.length;

  return (
    <main className="flex h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Review queue</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[17px] leading-[1.55]">
        <span>{paidCount} paid on time</span>
        <span className="text-rf-hairline">·</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-rf-spark-text">
          <span aria-hidden className="inline-block size-2 rounded-full bg-rf-spark" />
          {held.length} held
        </span>
        {[...ringGroups].map(([label, size]) => (
          <span key={label} className="text-rf-slate">
            — {size} under ring <code className="font-mono text-rf-ink">{label}</code>
          </span>
        ))}
        {[...pairGroups].map((label) => (
          <span key={label} className="text-rf-slate">
            — 2 as a pair (<code className="font-mono text-rf-ink">{label}</code>)
          </span>
        ))}
      </p>
      <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-[20px] border border-rf-hairline bg-rf-white">
        <ReviewGrid rows={rows} />
      </div>
    </main>
  );
}
