import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { checkClaims, holdEmailCopy, investigate, redTeamRule, releaseEmailCopy, type Claim } from "@ringfence/agents";
import { scoreRun, type RingSummary } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, parseDemoWeek } from "@/lib/fixtures";
import { layoutRing } from "@/lib/ring-layout";
import { buildRingTimelineData } from "@/lib/ring-timeline-data";
import { RingGraph } from "./ring-graph";
import { RingTimeline } from "./ring-timeline";

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

export default async function RingDetailPage({ params, searchParams }: { params: Promise<{ ringId: string }>; searchParams: Promise<{ week?: string }> }) {
  await connection();
  const [{ ringId }, { week: rawWeek }] = await Promise.all([params, searchParams]);
  const week = parseDemoWeek(rawWeek);

  const run = loadWeekRun(week);
  const truth = loadWeekTruth(week);
  const { rings } = scoreRun(run);
  const week2Members = truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id);
  const ring: RingSummary | undefined = week === 2
    ? {
        ring_id: ringId,
        member_sender_item_ids: week2Members,
        size: week2Members.length,
        reasons: ["shared referrer", "20-minute signup burst", "fast onboarding", "quiet after onboarding"],
        louvain_clusters: week2Members.length,
      }
    : rings.find((r) => r.ring_id === ringId);
  if (!ring) notFound();

  const payoutAt = week === 0 ? "2026-10-26T09:00:00Z" : week === 1 ? "2026-11-02T09:00:00Z" : "2026-11-09T09:00:00Z";
  const { nodes, links, operatorIds } = layoutRing(ring, run, { width: GRAPH_WIDTH, height: GRAPH_HEIGHT });
  const { resources: timelineResources, events: timelineItems } = buildRingTimelineData(ring, run, nodes, payoutAt);
  const memberAccountIds = new Set(nodes.map((n) => n.id));
  const narrativeLabel = truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;

  const caseFile = week === 1 ? checkClaims(investigate(ring, run), run) : undefined;
  const proposedRule = caseFile ? redTeamRule(caseFile.proposed_rule) : undefined;
  const sampleMemberItem = run.items.find((item) => item.sender_item_id === ring.member_sender_item_ids[0]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 bg-rf-mist px-8 py-6 text-rf-ink">
      <div>
        <Link href={`/review?week=${week}`} className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Review queue
        </Link>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em]">
          Ring <code className="font-mono">{narrativeLabel}</code>
        </h1>
        <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
          {week === 2
            ? `${ring.size} new accounts; no shared graph edges; held by fixture rule R-07`
            : week === 0
              ? `${ring.size} accounts from the future ring; all paid before Ringfence`
              : `${ring.size} accounts linked · ${caseFile?.claims_checked.checked ?? 0} of ${caseFile?.claims_checked.total ?? 0} claims checked`}
        </p>
        <nav aria-label="Demo week" className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/review/R-01?week=0" className={`rounded-full border px-3 py-1.5 ${week === 0 ? "border-rf-ink bg-rf-ink text-white" : "border-rf-hairline hover:bg-rf-white"}`}>
            Week 0
          </Link>
          <Link href="/review/R-01?week=1" className={`rounded-full border px-3 py-1.5 ${week === 1 ? "border-rf-ink bg-rf-ink text-white" : "border-rf-hairline hover:bg-rf-white"}`}>
            Week 1
          </Link>
          <Link href="/review/R-07?week=2" className={`rounded-full border px-3 py-1.5 ${week === 2 ? "border-rf-ink bg-rf-ink text-white" : "border-rf-hairline hover:bg-rf-white"}`}>
            Week 2
          </Link>
        </nav>
      </div>

      <div className="rounded-[20px] border border-rf-hairline bg-rf-white p-4">
        <RingGraph nodes={nodes} links={links} operatorIds={week === 2 ? new Set<string>() : operatorIds} width={GRAPH_WIDTH} height={GRAPH_HEIGHT} />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Week {week} sign-ups</h2>
            <p className="mt-1 text-sm text-rf-slate">
              {week === 0 ? "Nine ring accounts were paid before Ringfence; four later went unclaimed." : week === 1 ? "23 accounts started within one 15-minute window." : "18 new accounts used different devices, domains, and IPs in one 20-minute window."}
            </p>
          </div>
          <span className="font-mono text-xs text-rf-slate">BRYNTUM SCHEDULER</span>
        </div>
        <RingTimeline
          resources={timelineResources}
          events={timelineItems}
          payoutAt={payoutAt}
        />
      </section>

      {caseFile && (
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
      )}

      {proposedRule && (
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
      )}
      {week === 2 && (
        <p className="rounded-[20px] border border-rf-hairline bg-rf-white p-4 text-sm text-rf-slate">
          Simulated Week 2 fixture: the 18 isolated accounts are shown as held by R-07 (learned). A's evaluator will supply the production decision and red-team score.
        </p>
      )}

      {sampleMemberItem && (
      <section>
        <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Simulated payee email</h2>
        <p className="mt-1 text-sm text-rf-slate">Preview only — nothing is sent in this demo. FR-24: the wording never accuses the payee.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {[holdEmailCopy(sampleMemberItem.amount), releaseEmailCopy(sampleMemberItem.amount)].map((email) => (
            <div key={email.subject} className="rounded-[20px] border border-rf-hairline bg-rf-white p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-rf-slate">{email.subject}</p>
              <p className="mt-2 text-sm leading-[1.55] text-rf-ink">{email.body}</p>
            </div>
          ))}
        </div>
      </section>
      )}
    </main>
  );
}
