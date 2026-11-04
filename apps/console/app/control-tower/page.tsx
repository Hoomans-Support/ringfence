import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { checkClaims, investigate, redTeamRule } from "@ringfence/agents";
import { scoreRun, type ItemDecision, type RingSummary } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { layoutRing } from "@/lib/ring-layout";
import { ControlTower, type ControlTowerData } from "./control-tower";

export const metadata: Metadata = { title: "Control tower" };

// Matches the ring-graph widget's actual rendered aspect ratio (measured ~825x724, ~1.14:1) rather
// than an arbitrary one, so the SVG's viewBox scaling doesn't letterbox extra white margin on top
// of what graph-layout.ts's own radius/collision spacing already leaves.
const GRAPH_WIDTH = 480;
const GRAPH_HEIGHT = 420;

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
        ? { ...decision, decision: "HOLD", ring_id: "R-07", hold_group_id: "R-07", reasons: ["R-07 learned rule"] }
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

  const ringGraph: ControlTowerData["ringGraph"] = ring
    ? (() => {
        const { nodes, links, operatorIds } = layoutRing(ring, run, { width: GRAPH_WIDTH, height: GRAPH_HEIGHT });
        const memberAccountIds = new Set(nodes.map((n) => n.id));
        const ringLabel = truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;
        return { ringLabel, memberCount: ring.size, nodes, links, operatorIds: week === 2 ? new Set<string>() : operatorIds, width: GRAPH_WIDTH, height: GRAPH_HEIGHT };
      })()
    : { ringLabel: "No active ring", memberCount: 0, nodes: [], links: [], operatorIds: new Set<string>(), width: GRAPH_WIDTH, height: GRAPH_HEIGHT };

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
        };
      })()
    : week === 2
      ? { ruleId: "R-07 (learned)", variants: 0, caught: 0, heldOut: 0, heldOutCaught: 0, note: "The learned-rule result will appear here when A's evaluator is connected." }
      : { ruleId: "—", variants: 0, caught: 0, heldOut: 0, heldOutCaught: 0, note: "No Ringfence rule was active in Week 0." };

  const nextWeek: DemoWeek | undefined = week < 2 ? ((week + 1) as DemoWeek) : undefined;

  return (
    <main className="flex min-h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Control tower</h1>
          <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
            Simulated Week {week}: ring graph, money kept against leaked, false holds and rule robustness.
          </p>
        </div>
        <Link
          href={`/review?week=${week}`}
          className="rounded-full border border-rf-hairline px-3 py-1.5 text-sm font-medium text-rf-slate hover:bg-rf-white hover:text-rf-ink"
        >
          ← Week {week} review queue
        </Link>
      </div>
      {/* State (which week you're looking at) and action (advance the demo) are visually distinct:
          a tab group for state, one coral button - the brand's one reserved highlight - for the
          single action. Direct Week 0/1/2 tabs replace "Previous week", which only duplicated what
          clicking a tab already does. */}
      <nav aria-label="Demo week" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex gap-1 rounded-full border border-rf-hairline p-1">
          {([0, 1, 2] as const).map((w) => (
            <Link
              key={w}
              href={`/control-tower?week=${w}`}
              aria-current={week === w ? "page" : undefined}
              className={`rounded-full px-3 py-1 font-medium ${week === w ? "bg-rf-ink text-white" : "text-rf-slate hover:bg-rf-mist"}`}
            >
              Week {w}
            </Link>
          ))}
        </div>
        {nextWeek !== undefined && (
          <Link href={`/control-tower?week=${nextWeek}`} className="rounded-full bg-rf-spark px-3 py-1.5 font-medium text-white hover:opacity-85">
            Step to week {nextWeek} →
          </Link>
        )}
      </nav>
      {/* Exact content height, not a flex-filled viewport box: studio/theme.ts's 42 rows at
          studioCanvasRowHeight 18px (the ringGraph widget's own ySpan, matching the three
          right-column widgets' 14+14+14) plus its 24px top/bottom studioCanvasPadding gives 804px;
          measured AG Studio's actual rendered content at 806px (2px of border/rounding the theme
          tokens don't account for exactly) plus this wrapper's own p-2/border — so AG Studio
          always renders at its natural full height and never needs its own internal scrollbar.
          The page scrolls instead, like any normal page, at viewports shorter than that (was a
          scrollable box nested inside a non-scrolling page). */}
      <div className="mt-5 h-[828px] rounded-[20px] border border-rf-hairline bg-rf-white p-2">
        <ControlTower
          licenseKey={process.env.AG_STUDIO}
          ringGraph={ringGraph}
          money={{ keptUsd, leakedUsd }}
          falseHold={{ heldCount, falseHoldCount }}
          ruleRobustness={ruleRobustness}
        />
      </div>
    </main>
  );
}
