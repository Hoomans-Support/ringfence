import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { checkClaims, investigate, redTeamRule, type RuleCondition } from "@ringfence/agents";
import { scoreRun, type RingSummary } from "@ringfence/engine";
import { loadWeek1Run, loadWeek1Truth } from "@/lib/fixtures";

export const metadata: Metadata = { title: "Rules" };

function describeCondition(c: RuleCondition): string {
  switch (c.signal) {
    case "signup_burst":
      return `${c.min_accounts ?? "Several"} or more accounts signed up through the same referrer within ${c.window_min} minutes of each other.`;
    case "onboarding_seconds":
      return `Onboarding finished in ${c.max} seconds or less.`;
    case "activity_after_onboarding":
      return c.max === 0 ? "No activity after onboarding." : `No more than ${c.max} actions after onboarding.`;
    default:
      return c.signal.replace(/_/g, " ");
  }
}

export default async function RulesPage() {
  await connection();

  const run = loadWeek1Run();
  const truth = loadWeek1Truth();
  const { rings } = scoreRun(run);

  const accountBySenderItemId = new Map(run.items.map((it) => [it.sender_item_id, it.context.account_id]));

  // Same join the review queue and ring detail use: the engine's own ring id (R-01, R-02...)
  // against the demo's narrative label (e.g. "R-12"), keyed by account.
  function narrativeLabel(ring: RingSummary): string {
    const memberAccountIds = new Set(
      ring.member_sender_item_ids.map((id) => accountBySenderItemId.get(id)).filter((x): x is string => Boolean(x)),
    );
    return truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id;
  }

  const rules = rings.map((ring) => {
    const caseFile = checkClaims(investigate(ring, run), run);
    return { ring, label: narrativeLabel(ring), rule: redTeamRule(caseFile.proposed_rule) };
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 bg-rf-mist px-8 py-6 text-rf-ink">
      <div>
        <Link href="/review" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Review queue
        </Link>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em]">Rules</h1>
        <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
          Each rule the investigator proposed, red-teamed against 200 disguised copies of the ring it came from.
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-[20px] border border-rf-hairline bg-rf-white p-6 text-rf-slate">
          No rules proposed yet — a ring needs 3 or more linked accounts before the investigator writes one.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rules.map(({ ring, label, rule }) => (
            <li key={rule.id} className="rounded-[20px] border border-rf-hairline bg-rf-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[20px] font-semibold tracking-[-0.03em]">
                  Rule <code className="font-mono">{rule.id}</code>
                </h2>
                <span className="rounded-full bg-rf-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rf-ink">
                  {rule.action}
                </span>
              </div>
              <p className="mt-1 text-sm text-rf-slate">
                Source:{" "}
                <Link href={`/review/${ring.ring_id}`} className="font-mono text-rf-ink underline-offset-2 hover:underline">
                  {label}
                </Link>
                {" · "}
                {rule.approved_by ? `Approved by ${rule.approved_by}` : "Not yet approved"}
              </p>
              <ul className="mt-3 list-disc pl-5 text-[15px] leading-[1.5] text-rf-ink">
                {rule.when.all.map((c, i) => (
                  <li key={i}>{describeCondition(c)}</li>
                ))}
              </ul>
              {rule.red_team && (
                <>
                  <p className="mt-3 text-[15px] font-medium">
                    Survived{" "}
                    <span className="text-rf-spark-text">
                      {rule.red_team.caught} of {rule.red_team.variants}
                    </span>{" "}
                    disguised attacks — {rule.red_team.held_out_caught} of {rule.red_team.held_out} held out.
                  </p>
                  {rule.red_team.misses.length > 0 && (
                    <details className="mt-2 text-sm text-rf-slate">
                      <summary className="cursor-pointer">See {rule.red_team.misses.length} that slipped through</summary>
                      <p className="mt-1 font-mono text-xs">
                        {rule.red_team.misses.slice(0, 10).join(", ")}
                        {rule.red_team.misses.length > 10 ? "…" : ""}
                      </p>
                    </details>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
