import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { checkClaims, investigate, redTeamRule } from "@ringfence/agents";
import { scoreRun, type ItemDecision, type RingSummary } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { buildRingGraphData } from "@/lib/ring-layout";
import { ControlTower, type ControlTowerData } from "./control-tower";

export const metadata: Metadata = { title: "Control tower" };

export default async function ControlTowerPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await connection();

  const { week: rawWeek } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const run = loadWeekRun(week);
  const truth = loadWeekTruth(week);
  const scored = scoreRun(run);
  const learnedRingItems = new Set(truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
  const decisions: ItemDecision[] = week === 0
    ? scored.decisions.map((decision) => ({ ...decision, decision: "PAY" }))
    : week === 2
      ? scored.decisions.map((decision) => learnedRingItems.has(decision.sender_item_id)
        // No shared graph edges, so no ring_id (issue #4): this is rule R-07's own hold group, never a ring's.
        ? { ...decision, decision: "HOLD", hold_group_id: "rule:R-07", reasons: ["R-07 learned rule"] }
        : decision)
      : scored.decisions;

  const truthBySenderItemId = new Map(truth.map((t) => [t.sender_item_id, t] as const));
  const amountBySenderItemId = new Map(run.items.map((it) => [it.sender_item_id, Number(it.amount.value)] as const));

  // Fraud money is whatever the demo generator labelled "ring": held means kept from leaking,
  // paid means it leaked. Everything else (roommates, coworkers, honest) is legitimate, so a hold
  // on one of those is a false hold, not a catch.
  let keptUsd = 0;
  let leakedUsd = 0;
  let heldCount = 0;
  let falseHoldCount = 0;
  for (const d of decisions) {
    const amount = amountBySenderItemId.get(d.sender_item_id) ?? 0;
    const isRingFraud = truthBySenderItemId.get(d.sender_item_id)?.group === "ring";
    const held = d.decision !== "PAY";
    if (isRingFraud) {
      if (held) keptUsd += amount;
      else leakedUsd += amount;
    }
    if (held) {
      heldCount++;
      if (!isRingFraud) falseHoldCount++;
    }
  }

  const ring: RingSummary | undefined = week === 1
    ? scored.rings.find((r) => r.size >= 3)
    : week === 2
      ? {
          ring_id: "R-07",
          member_sender_item_ids: [...learnedRingItems],
          size: learnedRingItems.size,
          reasons: ["shared referrer", "20-minute signup burst", "fast onboarding", "quiet after onboarding"],
          louvain_clusters: learnedRingItems.size,
        }
      : undefined;

  const nextWeek: DemoWeek | undefined = week < 2 ? ((week + 1) as DemoWeek) : undefined;

  const ringGraph: ControlTowerData["ringGraph"] = ring
    ? (() => {
        const { nodeIds, links, operatorIds } = buildRingGraphData(ring, run);
        const ringLabel = truth.find((t) => nodeIds.includes(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;
        // Week 2's group has no shared graph edges: it's rule R-07's own hold group, never a ring's (issue #4).
        return { kind: week === 2 ? "rule" : "ring", ringLabel, memberCount: ring.size, nodeIds, links, operatorIds: week === 2 ? new Set<string>() : operatorIds };
      })()
    : { kind: "ring", ringLabel: "No active ring", memberCount: 0, nodeIds: [], links: [], operatorIds: new Set<string>() };

  const ruleRobustness: ControlTowerData["ruleRobustness"] = week === 1 && ring
    ? (() => {
        const caseFile = checkClaims(investigate(ring, run), run);
        const rule = redTeamRule(caseFile.proposed_rule);
        const rt = rule.red_team;
        return {
          ruleId: rule.id,
          variants: rt?.variants ?? 0,
          caught: rt?.caught ?? 0,
          heldOut: rt?.held_out ?? 0,
          heldOutCaught: rt?.held_out_caught ?? 0,
          // The existing step-to-next-week flow, not a fabricated "improved" rule: week 2's own
          // card already shows the honest "waiting on A's evaluator" note rather than invented
          // numbers, so this button's only real effect is navigating there, same as the nav's own
          // "Step to week" link.
          nextStepHref: nextWeek !== undefined ? `/control-tower?week=${nextWeek}` : undefined,
        };
      })()
    : week === 2
      ? { ruleId: "R-07 (learned)", variants: 0, caught: 0, heldOut: 0, heldOutCaught: 0, note: "The learned-rule result will appear here when A's evaluator is connected." }
      : { ruleId: "—", variants: 0, caught: 0, heldOut: 0, heldOutCaught: 0, note: "No Ringfence rule was active in Week 0." };

  return (
    <main className="flex min-h-dvh flex-col bg-rf-mist px-8 py-4 text-rf-ink">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Control tower</h1>
        <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
          Simulated Week {week}: ring graph, money kept against leaked, false holds and rule robustness.
        </p>
      </div>
      {/* State (which week you're looking at), the one action (advance the demo) and the escape
          hatch back to the queue are visually distinct from each other: a tab group for state, one
          coral button - the brand's one reserved highlight - for the action, a plain outlined pill
          for navigation. Direct Week 0/1/2 tabs replace "Previous week", which only duplicated what
          clicking a tab already does. */}
      <nav aria-label="Demo week" className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex gap-1 rounded-full border border-rf-hairline p-1">
          {([0, 1, 2] as const).map((w) => (
            <Link
              key={w}
              href={`/control-tower?week=${w}`}
              aria-current={week === w ? "page" : undefined}
              className={`rounded-full px-3 py-1 font-medium ${week === w ? "bg-rf-ink text-rf-white" : "text-rf-slate hover:bg-rf-mist"}`}
            >
              Week {w}
            </Link>
          ))}
        </div>
        {nextWeek !== undefined ? (
          <Link href={`/control-tower?week=${nextWeek}`} className="rounded-full bg-rf-spark px-3 py-1.5 font-medium text-white hover:opacity-85">
            Step to week {nextWeek} →
          </Link>
        ) : (
          <span className="cursor-default rounded-full bg-rf-mist px-3 py-1.5 font-medium text-rf-slate">Week 2 is the most recent</span>
        )}
        <Link
          href={`/review?week=${week}`}
          className="rounded-full border border-rf-hairline px-3 py-1.5 font-medium text-rf-slate hover:bg-rf-white hover:text-rf-ink"
        >
          ← Week {week} review queue
        </Link>
      </nav>
      {/* Flattened: no extra card (border/background/padding) wrapping AG Studio's own canvas,
          which already matches the page's mist background (studio/theme.ts) - this div exists
          only to give AG Studio a definite pixel height to measure itself against. Theory (42 rows
          at 16px + 16px top/bottom padding) gives 704px; measured AG Studio's own real rendered
          height at 706px (2px of border/rounding the theory doesn't capture, same gap found before
          at the old row height) and used that, so it never needs its own internal scrollbar - the
          page scrolls instead, like any normal page, at viewports shorter than that. */}
      <div className="mt-3 h-[706px]">
        {/* key={week}: AG Studio reads its `widgets` prop once, at mount, to register each
            widget's options as its initial data - found by actually clicking "Step to week" through
            all three weeks (not just navigating straight to a URL, which always mounts fresh) and
            seeing the title update to "Week 2" while every card still showed Week 0's numbers. A
            key forces React to unmount and remount the whole subtree on a real week change instead
            of trying to hand AG Studio data it doesn't re-read. */}
        <ControlTower
          key={week}
          licenseKey={process.env.AG_STUDIO}
          ringGraph={ringGraph}
          money={{ kind: week === 2 ? "rule" : "ring", keptUsd, leakedUsd }}
          falseHold={{ heldCount, falseHoldCount }}
          ruleRobustness={ruleRobustness}
        />
      </div>
    </main>
  );
}
