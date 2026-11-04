import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { checkClaims, investigate, redTeamRule } from "@ringfence/agents";
import { scoreRun, type ItemDecision, type RingSummary } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { layoutRing } from "@/lib/ring-layout";
import { ControlTower, type ControlTowerData } from "./control-tower";

export const metadata: Metadata = { title: "Control tower" };

const GRAPH_WIDTH = 440;
const GRAPH_HEIGHT = 360;

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

  const previousWeek: DemoWeek | undefined = week > 0 ? ((week - 1) as DemoWeek) : undefined;
  const nextWeek: DemoWeek | undefined = week < 2 ? ((week + 1) as DemoWeek) : undefined;

  return (
    <main className="flex h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Control tower</h1>
          <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
            Simulated Week {week}: ring graph, money kept against leaked, false holds and rule robustness.
          </p>
        </div>
        <Link href={`/review?week=${week}`} className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Week {week} review queue
        </Link>
      </div>
      <nav aria-label="Demo week" className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href="/control-tower?week=0" className={`rounded-full border px-3 py-1.5 ${week === 0 ? "border-rf-ink bg-rf-ink text-white" : "border-rf-hairline hover:bg-rf-white"}`}>Week 0</Link>
        {previousWeek !== undefined && <Link href={`/control-tower?week=${previousWeek}`} className="rounded-full border border-rf-hairline px-3 py-1.5 hover:bg-rf-white">Previous week</Link>}
        <span className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-white">Week {week}</span>
        {nextWeek !== undefined && <Link href={`/control-tower?week=${nextWeek}`} className="rounded-full bg-rf-ink px-3 py-1.5 font-medium text-white hover:opacity-85">Step to week {nextWeek}</Link>}
      </nav>
      <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[20px] border border-rf-hairline bg-rf-white p-2">
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
