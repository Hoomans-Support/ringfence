import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { applyRule } from "@ringfence/agents";
import { scoreRun, type ItemDecision } from "@ringfence/engine";
import { loadWeekDemoMetadata, loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { buildR12Learning } from "@/lib/learned-rule";
import { prettifyReason } from "@/lib/reasons";
import { HoldIcon, PayIcon, RuleIcon } from "@/app/icons";
import { ReviewGrid, type ReviewRow } from "./data-grid";
import { SurveyAppScreen } from "./survey-app-screen";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();

  const { week: rawWeek, adjusted: rawAdjusted } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const adjusted = rawAdjusted === "1";
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const run = loadWeekRun(outcomeWeek);
  const truth = loadWeekTruth(outcomeWeek);
  const scored = scoreRun(run);
  const week1Run = week >= 2 ? loadWeekRun(1) : undefined;
  const week1Truth = week >= 2 ? loadWeekTruth(1) : undefined;
  const learning = week1Run && week1Truth ? buildR12Learning(week1Run, week1Truth) : null;
  const selectedRule = learning ? (adjusted && learning.revised ? learning.revised : learning.rule) : null;
  const learnedMatches = week === 3 && selectedRule ? new Set(applyRule(selectedRule, run)) : new Set<string>();
  const week4Labels = week === 4 ? loadWeekTruth(4) : [];
  const networkMatches = new Set(week4Labels.filter((label) => label.group === "ring_match").map((label) => label.sender_item_id));
  const decisions: ItemDecision[] = week === 0
    ? scored.decisions.map((decision) => ({ ...decision, decision: "PAY" }))
    : week === 3
      ? scored.decisions.map((decision) => learnedMatches.has(decision.sender_item_id)
        ? { ...decision, decision: "HOLD", ring_id: undefined, hold_group_id: `rule:${selectedRule?.id ?? "R-07"}`, reasons: [`${selectedRule?.id ?? "R-07"} learned rule`] }
        : decision)
      : week === 4
        ? scored.decisions.map((decision) => networkMatches.has(decision.sender_item_id)
          ? { ...decision, decision: "HOLD", ring_id: undefined, hold_group_id: "network:R-12", reasons: ["network_match"] }
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
      const group = d.ring_id ? (ringLabelById.get(d.ring_id) ?? d.ring_id) : (d.hold_group_id ?? d.sender_item_id);
      const kind = d.ring_id ? "ring" : d.hold_group_id?.startsWith("rule:") ? "rule" : d.hold_group_id?.startsWith("network:") ? "network" : d.hold_group_id?.startsWith("P-") ? "pair" : "solo";
      const selfReleaseUrl = kind === "solo" && process.env.RINGFENCE_API_URL
        ? (() => { const url = new URL("/self-release/start", process.env.RINGFENCE_API_URL); url.searchParams.set("program_id", process.env.RINGFENCE_PROGRAM_ID ?? "budgetapp"); url.searchParams.set("run_id", run.sender_batch_header.sender_batch_id); url.searchParams.set("sender_item_id", d.sender_item_id); return url.toString(); })()
        : undefined;
      return {
        group,
        kind,
        senderItemId: d.sender_item_id,
        receiver: item.receiver,
        amount: Number(item.amount.value),
        reasons: d.reasons.map(prettifyReason).join(" · "),
        // The fixture has no hold-created timestamp. Use signup time only as a visible,
        // explicitly simulated age proxy until the API supplies the actual hold timestamp.
        holdExpiresAt: new Date(new Date(item.context.signup_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        // This operator-facing copy action demonstrates a future delivery path; it is not a payee notification channel.
        selfReleaseUrl,
      };
    })
    .filter((r): r is ReviewRow => Boolean(r))
    // Soonest-expiring first, matching the caption below and the hold calendar's own ordering —
    // a reviewer planning which cases need attention first sees the most urgent ones up top.
    .sort((a, b) => Date.parse(a.holdExpiresAt) - Date.parse(b.holdExpiresAt) || a.senderItemId.localeCompare(b.senderItemId));

  const ringGroups = new Map<string, { size: number; ringId: string }>();
  for (const r of week === 0 || week === 4 ? [] : rings) {
    const label = ringLabelById.get(r.ring_id) ?? r.ring_id;
    ringGroups.set(label, { size: r.size, ringId: r.ring_id });
  }
  // Held only by a learned rule, with no shared graph edges: its own hold group, never a ring's (issue #4).
  const ruleGroups = new Map<string, { size: number; ruleId: string }>();
  if (week === 3 && held.length > 0) {
    ruleGroups.set(`rule:${selectedRule?.id ?? "R-07"}`, { size: decisions.filter((d) => d.hold_group_id?.startsWith("rule:")).length, ruleId: selectedRule?.id ?? "R-07" });
  }
  const pairGroups = new Set(rows.filter((r) => r.kind === "pair").map((r) => r.group));
  const networkMatchCount = decisions.filter((decision) => decision.reasons.includes("network_match")).length;

  const paidCount = run.items.length - held.length;
  const truthByItem = new Map(truth.map((label) => [label.sender_item_id, label]));
  const falsePositives = week === 2 ? scored.decisions.filter((decision) => decision.decision === "HOLD" && truthByItem.get(decision.sender_item_id)?.group !== "ring") : [];
  const falseNegatives = week === 2 ? scored.decisions.filter((decision) => decision.decision === "PAY" && truthByItem.get(decision.sender_item_id)?.group === "ring") : [];
  const recovery = week === 4 ? loadWeekDemoMetadata(4)?.recovery : undefined;
  const previousWeek: DemoWeek | undefined = week > 0 ? ((week - 1) as DemoWeek) : undefined;
  const nextWeek: DemoWeek | undefined = week < 4 ? ((week + 1) as DemoWeek) : undefined;
  const nextHref = nextWeek === undefined ? undefined : week === 2
    ? `/review?week=${nextWeek}${adjusted ? "&adjusted=1" : ""}`
    : `/review?week=${nextWeek}`;

  return (
    <main className="flex h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Review queue</h1>
        <div className="flex items-center gap-4">
          <Link href={`/review/calendar?week=${week}${adjusted ? "&adjusted=1" : ""}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-rf-slate hover:text-rf-ink">
            <HoldIcon className="size-4" /> Hold calendar →
          </Link>
          <Link href={`/control-tower?week=${week}`} className="text-sm font-medium text-rf-slate hover:text-rf-ink">
            Control tower →
          </Link>
          <Link href="/fire-drill" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
            Fire drill →
          </Link>
          <Link href={`/rules?week=${week}${adjusted ? "&adjusted=1" : ""}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-rf-slate hover:text-rf-ink">
            <RuleIcon className="size-4" /> Rules →
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/review?week=0" className="rounded-full border border-rf-hairline px-3 py-1.5 hover:bg-rf-white">
          Reset demo
        </Link>
        {previousWeek !== undefined && (
          <Link href={`/review?week=${previousWeek}${week === 3 && adjusted ? "&adjusted=1" : ""}`} className="rounded-full border border-rf-hairline px-3 py-1.5 hover:bg-rf-white">
            Previous week
          </Link>
        )}
        <span className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-rf-white">Week {week}</span>
        {nextWeek !== undefined && nextHref && (
          <Link href={nextHref} className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-rf-white hover:opacity-85">
            Step to week {nextWeek}
          </Link>
        )}
      </div>
      {week === 2 && (
        <section className="mt-3 rounded-[16px] border border-rf-hairline bg-rf-white p-4 text-sm">
          <h2 className="font-semibold">Week 1 review · R-12 / R-07</h2>
          <p className="mt-1 text-rf-slate">Compared the real Week 1 engine decisions with the separate ground-truth fixture: {falsePositives.length} false holds and {falseNegatives.length} missed ring payees.</p>
          <p className="mt-2 text-rf-slate">The proposed R-07-v2 revision replays the saved red-team misses and closes {learning?.closedCount ?? 0} of {learning?.openCases.length ?? 0} cases. Accepting it changes only this walkthrough's URL state.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/rules?week=2" className="rounded-full border border-rf-hairline px-3 py-1.5 hover:bg-rf-mist">Inspect proposed revision</Link>
            {adjusted ? <span className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-rf-white">Adjustment accepted for this demo</span> : <Link href="/review?week=2&adjusted=1" className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-rf-white hover:opacity-85">Accept R-07-v2</Link>}
          </div>
        </section>
      )}
      {week === 1 && (
        <section className="mt-3 rounded-[16px] border border-rf-hairline bg-rf-white p-4 text-sm">
          <h2 className="font-semibold">The first full run reveals R-12</h2>
          <p className="mt-1 text-rf-slate">Week 0 released its smaller 9-account sample. This run exposes the full 23-account ring and a separate roommate pair, giving the investigator evidence to propose R-07.</p>
        </section>
      )}
      {week === 3 && (
        <section className="mt-3 rounded-[16px] border border-rf-hairline bg-rf-white p-4 text-sm">
          <h2 className="font-semibold">R-12 returns with fresh accounts</h2>
          <p className="mt-1 text-rf-slate">{adjusted ? "Week 2 accepted R-07-v2; its wider thresholds catch some of the disguises R-07 missed, while the rest still slip through." : "Week 2 did not accept the adjustment, so this run uses R-07 as proposed. The same disguises still evade it."} This week's holds are evaluated from the selected rule's actual conditions against the fixture items.</p>
        </section>
      )}
      {week === 4 && (
        <section className="mt-3 rounded-[16px] border border-rf-hairline bg-rf-white p-4 text-sm">
          <h2 className="font-semibold">The ring crosses into the survey app</h2>
          <p className="mt-1 text-rf-slate">Six of 120 payees reuse R-12's device and are marked as cross-program matches in this fixture. The Week 1 held payouts are simulated as cancelled while unclaimed: {recovery?.sender_item_ids.length ?? 0} items · ${recovery?.amount_usd.toFixed(2) ?? "0.00"}.</p>
          <SurveyAppScreen />
        </section>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[17px] leading-[1.55]">
        <span className="inline-flex items-center gap-1.5">
          <PayIcon className="size-4 text-rf-ink" /> {paidCount} paid on time
        </span>
        <span className="text-rf-hairline">·</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-rf-spark-text">
          <HoldIcon className="size-4 text-rf-spark" />
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
        {[...ruleGroups].map(([label, { size, ruleId }]) => (
          <span key={label} className="text-rf-slate">
            — {size} held by rule{" "}
            <Link href={`/review/${ruleId}?week=2`} className="font-mono text-rf-ink underline-offset-2 hover:underline">
              {ruleId}
            </Link>
          </span>
        ))}
        {networkMatchCount > 0 && <span className="text-rf-slate">— {networkMatchCount} cross-program matches from R-12</span>}
      </p>
      <p className="mt-1 text-xs text-rf-slate">
        {week === 2 ? "Reviewing Week 1 decisions against separate truth labels" : `Simulated Week ${week} fixture`} · expiry order uses signup time as an age proxy
        {week === 4 ? " · cross-program outcome and recovery are fixture-backed, not a live cancellation response" : ""}
      </p>
      <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-[20px] border border-rf-hairline bg-rf-white">
        <ReviewGrid rows={rows} />
      </div>
    </main>
  );
}
