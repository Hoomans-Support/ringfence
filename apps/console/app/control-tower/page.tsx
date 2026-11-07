import type { Metadata } from "next";
import { connection } from "next/server";
import { applyRule, checkClaims, investigate, redTeamRule, summarizeForAnalyst } from "@ringfence/agents";
import { scoreRun, type ItemDecision, type RingSummary } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { buildR12Learning } from "@/lib/learned-rule";
import { buildRingGraphData } from "@/lib/ring-layout";
import { ControlTower, type ControlTowerData } from "./control-tower";

export const metadata: Metadata = { title: "Control tower" };

export default async function ControlTowerPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();

  const { week: rawWeek, adjusted: rawAdjusted } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const adjusted = rawAdjusted === "1";
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const run = loadWeekRun(outcomeWeek);
  const truth = loadWeekTruth(outcomeWeek);
  const scored = scoreRun(run);
  const learning = week >= 2 ? buildR12Learning(loadWeekRun(1), loadWeekTruth(1)) : null;
  const selectedRule = learning ? (adjusted && learning.revised ? learning.revised : learning.rule) : null;
  const ruleMatches = week === 3 && selectedRule ? new Set(applyRule(selectedRule, run)) : new Set<string>();
  const networkMatches = week === 4 ? new Set(loadWeekTruth(4).filter((label) => label.group === "ring_match").map((label) => label.sender_item_id)) : new Set<string>();
  const decisions: ItemDecision[] = week === 0
    ? scored.decisions.map((decision) => ({ ...decision, decision: "PAY" }))
    : week === 3
      ? scored.decisions.map((decision) => ruleMatches.has(decision.sender_item_id)
        ? { ...decision, decision: "HOLD", ring_id: undefined, hold_group_id: `rule:${selectedRule?.id ?? "R-07"}`, reasons: [`${selectedRule?.id ?? "R-07"} learned rule`] }
        : decision)
      : week === 4
        ? scored.decisions.map((decision) => networkMatches.has(decision.sender_item_id)
          ? { ...decision, decision: "HOLD", ring_id: undefined, hold_group_id: "network:R-12", reasons: ["network_match"] }
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
    const group = truthBySenderItemId.get(d.sender_item_id)?.group;
    const isRingFraud = group === "ring" || group === "ring_match";
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

  const ring: RingSummary | undefined = week === 1 || week === 2 ? scored.rings.find((r) => r.size >= 3) : undefined;

  const nextWeek: DemoWeek | undefined = week < 4 ? ((week + 1) as DemoWeek) : undefined;

  const caseFile = (week === 1 || week === 2) && ring ? checkClaims(investigate(ring, run), run) : undefined;

  const ringGraph: ControlTowerData["ringGraph"] = ring
    ? (() => {
        const { nodeIds, links, operatorIds } = buildRingGraphData(ring, run);
        const ringLabel = truth.find((t) => nodeIds.includes(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;
        return { kind: week === 3 ? "rule" : "ring", ringLabel, memberCount: ring.size, nodeIds, links, operatorIds: week === 3 ? new Set<string>() : operatorIds };
      })()
    : { kind: "ring", ringLabel: "No active ring", memberCount: 0, nodeIds: [], links: [], operatorIds: new Set<string>() };

  const ruleRobustness: ControlTowerData["ruleRobustness"] = (week === 1 || week === 2) && ring
    ? (() => {
        const rule = redTeamRule(caseFile!.proposed_rule);
        const rt = rule.red_team;
        return {
          ruleId: rule.id,
          variants: rt?.variants ?? 0,
          caught: rt?.caught ?? 0,
          heldOut: rt?.held_out ?? 0,
          heldOutCaught: rt?.held_out_caught ?? 0,
          nextStepHref: nextWeek !== undefined ? `/review?week=${nextWeek}${adjusted ? "&adjusted=1" : ""}` : undefined,
        };
      })()
    : week === 3 && selectedRule
      ? { ruleId: selectedRule.id, variants: selectedRule.red_team?.variants ?? 0, caught: selectedRule.red_team?.caught ?? 0, heldOut: selectedRule.red_team?.held_out ?? 0, heldOutCaught: selectedRule.red_team?.held_out_caught ?? 0, note: "Week 3 applies this rule to the returning ring fixture." }
      : { ruleId: "—", variants: 0, caught: 0, heldOut: 0, heldOutCaught: 0, note: "No Ringfence rule was active in Week 0." };

  const analystNote = week === 4
    ? "Six survey-app payees reuse an R-12 device; their cross-program holds are fixture outcomes until the live screening control is run."
    : caseFile
    ? await summarizeForAnalyst(caseFile, { keptUsd, leakedUsd })
    : "No linked ring is active in this week. Keep watching the payout run for new signals.";
  const rawThreshold = Number(process.env.RINGFENCE_RING_WATCH_THRESHOLD_USD ?? 500);
  const ringWatch: ControlTowerData["ringWatch"] = {
    runId: run.sender_batch_header.sender_batch_id,
    ringId: ringGraph.ringLabel,
    thresholdUsd: Number.isFinite(rawThreshold) && rawThreshold > 0 ? rawThreshold : 500,
    keptUsd,
    leakedUsd,
    memberAmounts: Object.fromEntries((ring?.member_sender_item_ids ?? []).map((id) => [id, amountBySenderItemId.get(id) ?? 0])),
    enabled: Boolean(process.env.RINGFENCE_API_URL && process.env.RINGFENCE_MCP_KEY && ring),
  };

  return (
    <main className="flex min-h-dvh flex-col bg-rf-mist px-8 py-4 text-rf-ink">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Control tower</h1>
        <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
          Simulated Week {week}: ring graph, money kept against leaked, false holds, rule robustness, live Ring Watch and analyst read.
        </p>
      </div>
      {/* Flattened: no extra card (border/background/padding) wrapping AG Studio's own canvas,
          which already matches the page's mist background (studio/theme.ts) - this div exists
          only to give AG Studio a definite pixel height to measure itself against. Theory (42 rows
          at 16px + 16px top/bottom padding) gives 704px; measured AG Studio's own real rendered
          height at 706px (2px of border/rounding the theory doesn't capture, same gap found before
          at the old row height) and used that, so it never needs its own internal scrollbar - the
          page scrolls instead, like any normal page, at viewports shorter than that. */}
      <div className="mt-3 h-[940px]">
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
          ringWatch={ringWatch}
          analyst={{ note: analystNote }}
        />
      </div>
    </main>
  );
}
