import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { checkClaims, investigate, type Claim } from "@ringfence/agents";
import { buildGraph, scoreRun, type PayoutItem } from "@ringfence/engine";
import { loadWeek1Run, loadWeek1Truth } from "@/lib/fixtures";
import { computeLayout } from "@/lib/graph-layout";
import { RingGraph } from "./ring-graph";

const GRAPH_WIDTH = 640;
const GRAPH_HEIGHT = 420;

function describeCheck(claim: Claim): string {
  const c = claim.check;
  switch (c.kind) {
    case "shared_device":
      return `Device: ${c.device_hash}`;
    case "signup_window":
      return `Signed up within ${c.window_minutes} minutes of each other`;
    case "onboarding_speed":
      return `Onboarding finished in ${c.max_onboarding_seconds}s or less`;
    case "quiet_after_onboarding":
      return "No activity after onboarding";
    case "alias_pattern":
      return `Payout address pattern: ${c.alias_key}`;
    case "shared_referrer":
      return `Referrer: ${c.referrer_id}`;
    default:
      return "";
  }
}

export default async function RingDetailPage({ params }: { params: Promise<{ ringId: string }> }) {
  await connection();
  const { ringId } = await params;

  const run = loadWeek1Run();
  const truth = loadWeek1Truth();
  const { rings } = scoreRun(run);
  const ring = rings.find((r) => r.ring_id === ringId);
  if (!ring) notFound();

  const bySenderItemId = new Map(run.items.map((it) => [it.sender_item_id, it] as const));
  const members: PayoutItem[] = ring.member_sender_item_ids
    .map((id) => bySenderItemId.get(id))
    .filter((x): x is PayoutItem => Boolean(x));
  const memberAccountIds = new Set(members.map((it) => it.context.account_id));

  const narrativeLabel = truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;

  // Reuse the engine's own graph: the real edges that formed this ring, not a redrawn approximation.
  const { graph } = buildGraph(run.items);
  const links: { source: string; target: string }[] = [];
  graph.forEachEdge((_edge, _attrs, source, target) => {
    if (memberAccountIds.has(source) && memberAccountIds.has(target)) links.push({ source, target });
  });

  // The operator: whichever device the most members share (see ring-graph.tsx for the caveat on
  // this standing in for design.md's broader "shared signal" operator concept).
  const countByDevice = new Map<string, number>();
  for (const it of members) countByDevice.set(it.context.device_hash, (countByDevice.get(it.context.device_hash) ?? 0) + 1);
  const topDevice = [...countByDevice.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const operatorIds = new Set(members.filter((it) => it.context.device_hash === topDevice).map((it) => it.context.account_id));

  const layout = computeLayout([...memberAccountIds], links, { width: GRAPH_WIDTH, height: GRAPH_HEIGHT });

  const caseFile = checkClaims(investigate(ring, run), run);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 bg-rf-mist px-8 py-6 text-rf-ink">
      <div>
        <Link href="/review" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Review queue
        </Link>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em]">
          Ring <code className="font-mono">{narrativeLabel}</code>
        </h1>
        <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
          {ring.size} accounts linked · {caseFile.claims_checked.checked} of {caseFile.claims_checked.total} claims checked
        </p>
      </div>

      <div className="rounded-[20px] border border-rf-hairline bg-rf-white p-4">
        <RingGraph nodes={layout.nodes} links={layout.links} operatorIds={operatorIds} width={GRAPH_WIDTH} height={GRAPH_HEIGHT} />
      </div>

      <section>
        <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Case file</h2>
        <p className="mt-1 text-sm text-rf-slate">Each claim cites the accounts it's about — open one to see the evidence.</p>
        <ul className="mt-3 divide-y divide-rf-hairline rounded-[20px] border border-rf-hairline bg-rf-white">
          {caseFile.claims.map((claim) => (
            <li key={claim.id} className="px-5 py-3">
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-[17px]">
                  <span>{claim.text}</span>
                  <span
                    className={`shrink-0 font-mono text-xs uppercase tracking-wide ${claim.checked ? "text-rf-slate" : "text-rf-spark-text"}`}
                  >
                    {claim.checked ? "checked" : "unchecked"}
                  </span>
                </summary>
                <div className="mt-2 text-sm text-rf-slate">
                  <p>{describeCheck(claim)}</p>
                  <p className="mt-1">
                    Accounts:{" "}
                    <code className="font-mono text-rf-ink">{claim.check.account_ids.map((id) => id.replace(/^u_/, "")).join(", ")}</code>
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Proposed rule</h2>
        <pre className="mt-3 overflow-x-auto rounded-[20px] border border-rf-hairline bg-rf-white p-4 font-mono text-sm">
          {JSON.stringify(caseFile.proposed_rule, null, 2)}
        </pre>
      </section>
    </main>
  );
}
