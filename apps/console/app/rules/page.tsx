import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  checkClaims,
  closeCaughtCases,
  investigate,
  recordOpenCases,
  redTeamRule,
  type ProposedRule,
  type RuleCondition,
} from "@ringfence/agents";
import { scoreRun, type RingSummary } from "@ringfence/engine";
import { loadWeek1Run, loadWeek1Truth } from "@/lib/fixtures";
import { RuleIcon } from "@/app/icons";

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

/** What changed between a rule and its revision, one line per widened condition — the referrer axis
 *  never shows up here, since it has no numeric fix (red-team-cases.ts). */
function describeWidening(before: RuleCondition, after: RuleCondition): string | null {
  if (before.signal === "signup_burst" && before.window_min !== after.window_min) {
    return `the signup window from ${before.window_min} to ${after.window_min} minutes`;
  }
  if (before.signal === "onboarding_seconds" && before.max !== after.max) {
    return `the onboarding cap from ${before.max} to ${after.max} seconds`;
  }
  if (before.signal === "activity_after_onboarding" && before.max !== after.max) {
    return `the post-onboarding activity cap from ${before.max} to ${after.max}`;
  }
  return null;
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
    const rule = redTeamRule(caseFile.proposed_rule);

    // The red-team-misses feedback loop (FR-13's follow-on): this rule's non-held-out misses become
    // saved cases, the next proposal for this ring widens whichever threshold a majority of them
    // beat, and replaying the saved misses against that revision (closeCaughtCases) is what actually
    // closes them — distinct from the revision's own fresh red-team score, which is a new random
    // sample of 200 new disguises and can move even for cases the replay doesn't close. Computed
    // live from this request's fixture run, same as the rest of the demo: no persistence layer, no
    // live write path to back one.
    const openCases = recordOpenCases([], rule);
    const revisedBase: ProposedRule = openCases.length > 0 ? investigate(ring, run, { openCases }).proposed_rule : rule;
    const revised = revisedBase.id !== rule.id ? redTeamRule(revisedBase) : null;
    const closedCases = revised ? closeCaughtCases(openCases, revised) : [];
    const closedCount = closedCases.filter((c) => c.status === "closed").length;
    const widenings = revised
      ? rule.when.all.map((c, i) => describeWidening(c, revised.when.all[i]!)).filter((w): w is string => w !== null)
      : [];

    return { ring, label: narrativeLabel(ring), rule, openCases, revised, closedCount, widenings };
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 bg-rf-mist px-8 py-6 text-rf-ink">
      <div>
        <Link href="/review" className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Review queue
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-[32px] font-semibold tracking-[-0.03em]">
          <RuleIcon className="size-7 shrink-0" aria-hidden /> Rules
        </h1>
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
          {rules.map(({ ring, label, rule, openCases, revised, closedCount, widenings }) => (
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
                    Caught{" "}
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
              {openCases.length > 0 && (
                <div className="mt-4 rounded-[16px] border border-rf-hairline bg-rf-mist p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-rf-slate">Learning loop</h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-rf-ink">
                    {openCases.length} disguise{openCases.length === 1 ? "" : "s"} {rule.id} missed outright are saved as
                    open red-team cases.
                  </p>
                  {!revised ? (
                    <p className="mt-2 text-[15px] leading-[1.5] text-rf-slate">
                      Every one of them only beat the shared-referrer check, which has no numeric fix — {rule.id} stays
                      as proposed; this ring's cases can't improve it further.
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-[15px] leading-[1.5] text-rf-ink">
                        <code className="font-mono">{revised.id}</code> widens {widenings.join(" and ")} to chase them.
                      </p>
                      <p className="mt-2 text-[15px] leading-[1.5] text-rf-ink">
                        Caught{" "}
                        <span className="text-rf-spark-text">
                          {revised.red_team?.caught} of {revised.red_team?.variants}
                        </span>{" "}
                        in a fresh batch ({revised.red_team?.held_out_caught} of {revised.red_team?.held_out} held out)
                        — but replaying the {openCases.length} saved cases against it closes{" "}
                        <strong>{closedCount}</strong>.
                      </p>
                      <p className="mt-2 text-sm text-rf-slate">
                        {closedCount === 0
                          ? "None of them close: every one of these disguises pushed further past the original threshold than this widen reaches. The fresh score moving up is a new random sample, not proof this specific gap closed — that's what the replay checks separately from the headline number."
                          : closedCount < openCases.length
                            ? `Only the ones that didn't push too far past the new line close — the other ${openCases.length - closedCount} pushed further than this widen covers and stay open for the next round. That gap between the fresh score and the replay count is the honest read: a wider net catches more on average, not everything it looks like it caught.`
                            : "Every saved case closes — this widen fully covers how far each of them pushed."}
                      </p>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
