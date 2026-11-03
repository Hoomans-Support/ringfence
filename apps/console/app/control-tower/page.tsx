import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { checkClaims, investigate, redTeamRule } from "@ringfence/agents";
import { scoreRun } from "@ringfence/engine";
import { loadWeek1Run, loadWeek1Truth } from "@/lib/fixtures";
import { layoutRing } from "@/lib/ring-layout";
import { ControlTower, type ControlTowerData } from "./control-tower";

export const metadata: Metadata = { title: "Control tower" };

const GRAPH_WIDTH = 440;
const GRAPH_HEIGHT = 360;

export default async function ControlTowerPage() {
  await connection();

  const run = loadWeek1Run();
  const truth = loadWeek1Truth();
  const { decisions, rings } = scoreRun(run);

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

  // The one case-file-eligible ring (3+ accounts) this run holds — same ring the review queue and
  // rules page link to.
  const ring = rings.find((r) => r.size >= 3);

  const ringGraph: ControlTowerData["ringGraph"] = ring
    ? (() => {
        const { nodes, links, operatorIds } = layoutRing(ring, run, { width: GRAPH_WIDTH, height: GRAPH_HEIGHT });
        const memberAccountIds = new Set(nodes.map((n) => n.id));
        const ringLabel = truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;
        return { ringLabel, memberCount: ring.size, nodes, links, operatorIds, width: GRAPH_WIDTH, height: GRAPH_HEIGHT };
      })()
    : { ringLabel: "—", memberCount: 0, nodes: [], links: [], operatorIds: new Set<string>(), width: GRAPH_WIDTH, height: GRAPH_HEIGHT };

  const ruleRobustness: ControlTowerData["ruleRobustness"] = ring
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
    : { ruleId: "—", variants: 0, caught: 0, heldOut: 0, heldOutCaught: 0 };

  return (
    <main className="flex h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Control tower</h1>
          <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
            The ring graph, money kept against leaked, the false-hold meter and rule robustness — all from this run.
          </p>
        </div>
        <Link href="/review" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Review queue
        </Link>
      </div>
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
