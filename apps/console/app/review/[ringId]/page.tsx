import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { checkClaims, investigate, redTeamRule, type Claim } from "@ringfence/agents";
import { scoreRun } from "@ringfence/engine";
import { loadWeek1Run, loadWeek1Truth } from "@/lib/fixtures";
import { layoutRing } from "@/lib/ring-layout";
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

  const { nodes, links, operatorIds } = layoutRing(ring, run, { width: GRAPH_WIDTH, height: GRAPH_HEIGHT });
  const memberAccountIds = new Set(nodes.map((n) => n.id));
  const narrativeLabel = truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;

  const caseFile = checkClaims(investigate(ring, run), run);
  const proposedRule = redTeamRule(caseFile.proposed_rule);

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
        <RingGraph nodes={nodes} links={links} operatorIds={operatorIds} width={GRAPH_WIDTH} height={GRAPH_HEIGHT} />
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
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Proposed rule</h2>
          <Link href="/rules" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
            All rules →
          </Link>
        </div>
        {proposedRule.red_team && (
          <p className="mt-2 text-[15px] font-medium">
            Survived{" "}
            <span className="text-rf-spark-text">
              {proposedRule.red_team.caught} of {proposedRule.red_team.variants}
            </span>{" "}
            disguised attacks — {proposedRule.red_team.held_out_caught} of {proposedRule.red_team.held_out} held out.
          </p>
        )}
        <pre className="mt-3 overflow-x-auto rounded-[20px] border border-rf-hairline bg-rf-white p-4 font-mono text-sm">
          {JSON.stringify(
            // The miss list is for the rules page's own disclosure, not this raw-JSON preview.
            { ...proposedRule, red_team: proposedRule.red_team && { ...proposedRule.red_team, misses: undefined } },
            null,
            2,
          )}
        </pre>
      </section>
    </main>
  );
}
