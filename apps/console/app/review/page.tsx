import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { scoreRun, type ItemDecision } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { prettifyReason } from "@/lib/reasons";
import { ReviewGrid, type ReviewRow } from "./data-grid";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await connection();

  const { week: rawWeek } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const run = loadWeekRun(week);
  const truth = loadWeekTruth(week);
  const scored = scoreRun(run);
  const learnedRingItems = new Set(truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
  // Week 2 displays A's expected learned-rule result as fixture data. The
  // production rule evaluator and all payout decisions remain A-owned.
  const decisions: ItemDecision[] = week === 0
    ? scored.decisions.map((decision) => ({ ...decision, decision: "PAY" }))
    : week === 2
      ? scored.decisions.map((decision) => learnedRingItems.has(decision.sender_item_id)
        ? { ...decision, decision: "HOLD", ring_id: "R-07", hold_group_id: "R-07", reasons: ["R-07 learned rule"] }
        : decision)
      : scored.decisions;
  const rings = scored.rings;

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
      const group = d.ring_id
        ? (week === 2 ? "R-07 (learned)" : (ringLabelById.get(d.ring_id) ?? d.ring_id))
        : (d.hold_group_id ?? "—");
      return {
        group,
        kind: d.ring_id ? "ring" : "pair",
        senderItemId: d.sender_item_id,
        receiver: item.receiver,
        amount: Number(item.amount.value),
        reasons: d.reasons.map(prettifyReason).join(" · "),
        // The fixture has no hold-created timestamp. Use signup time only as a visible,
        // explicitly simulated age proxy until the API supplies the actual hold timestamp.
        holdExpiresAt: new Date(new Date(item.context.signup_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    })
    .filter((r): r is ReviewRow => Boolean(r))
    .sort((a, b) => a.group.localeCompare(b.group) || a.senderItemId.localeCompare(b.senderItemId));

  const ringGroups = new Map<string, { size: number; ringId: string }>();
  for (const r of week === 0 ? [] : rings) {
    const label = ringLabelById.get(r.ring_id) ?? r.ring_id;
    ringGroups.set(label, { size: r.size, ringId: r.ring_id });
  }
  if (week === 2 && held.length > 0) {
    ringGroups.set("R-07 (learned)", { size: learnedRingItems.size, ringId: "R-07" });
  }
  const pairGroups = new Set(rows.filter((r) => r.kind === "pair").map((r) => r.group));

  const paidCount = run.items.length - held.length;
  const previousWeek: DemoWeek | undefined = week > 0 ? ((week - 1) as DemoWeek) : undefined;
  const nextWeek: DemoWeek | undefined = week < 2 ? ((week + 1) as DemoWeek) : undefined;

  return (
    <main className="flex h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Review queue</h1>
        <div className="flex items-center gap-4">
          <Link href={`/control-tower?week=${week}`} className="text-sm font-medium text-rf-slate hover:text-rf-ink">
            Control tower →
          </Link>
          <Link href="/rules" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
            Rules →
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/review?week=0" className="rounded-full border border-rf-hairline px-3 py-1.5 hover:bg-rf-white">
          Reset demo
        </Link>
        {previousWeek !== undefined && (
          <Link href={`/review?week=${previousWeek}`} className="rounded-full border border-rf-hairline px-3 py-1.5 hover:bg-rf-white">
            Previous week
          </Link>
        )}
        <span className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-white">Week {week}</span>
        {nextWeek !== undefined && (
          <Link href={`/review?week=${nextWeek}`} className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-white hover:opacity-85">
            Step to week {nextWeek}
          </Link>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[17px] leading-[1.55]">
        <span>{paidCount} paid on time</span>
        <span className="text-rf-hairline">·</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-rf-spark-text">
          <span aria-hidden className="inline-block size-2 rounded-full bg-rf-spark" />
          {held.length} held
        </span>
        {[...ringGroups].map(([label, { size, ringId }]) => (
          <span key={label} className="text-rf-slate">
            — {size} under ring{" "}
            {week !== 0 ? (
              <Link href={week === 1 ? `/review/${ringId}` : `/review/${ringId}?week=2`} className="font-mono text-rf-ink underline-offset-2 hover:underline">
                {label}
              </Link>
            ) : (
              <code className="font-mono text-rf-ink">{label}</code>
            )}
          </span>
        ))}
        {[...pairGroups].map((label) => (
          <span key={label} className="text-rf-slate">
            — 2 as a pair (<code className="font-mono text-rf-ink">{label}</code>)
          </span>
        ))}
      </p>
      <p className="mt-1 text-xs text-rf-slate">
        Simulated Week {week} fixture · expiry order uses signup time as an age proxy
        {week === 2 ? " · learned-rule holds are fixture presentation until A's evaluator is connected" : ""}
      </p>
      <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-[20px] border border-rf-hairline bg-rf-white">
        <ReviewGrid rows={rows} />
      </div>
    </main>
  );
}
