// What the Learned rules page shows for each rule: its plain wording and conditions (from the real
// rule objects), what it does in a run, its red-team score, and where it came from. Plus the practice
// run comparison, straight from the committed fire drill (docs/fire-drill.md).
import { scoreRun } from "@ringfence/engine";
import type { DemoRule } from "@/app/demo-store";
import { buildDemo, type DemoData } from "./demo";
import { headlineRows, loadFireDrillData } from "./fire-drill-data";
import { loadWeekRun, loadWeekTruth, type DemoWeek } from "./fixtures";
import { buildR12Learning } from "./learned-rule";

export interface RuleView {
  kicker: string;
  name: string;
  plain: string;
  chips: string[];
  /** The list card's line under the name, by the rule's state. */
  listEffect: { on: string; off: string; waiting: string };
  effectLabel: string;
  simulated: boolean;
  stats: { n: string; label: string }[];
  sampleLabel: string;
  sample: { a: string; b: string; c: string; tag: string }[];
  footnote?: string;
  testHead: string;
  testPct: number;
  testNote: string;
  origin: { k: string; v: string }[];
  offWarn: string;
}

export interface RulesPageData {
  data: DemoData;
  nextRun: string;
  starter: DemoRule;
  views: Record<string, RuleView>;
  practice: { approach: string; lost: string; paused: string; strong: boolean }[];
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const signed = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(/^(\w+),/, "$1");
const fewer = (n: number) => (n > 0 && n < 1 ? "under 1" : String(Math.round(n)));

export function buildRulesPage(week: DemoWeek, adjusted: boolean): RulesPageData {
  const data = buildDemo(week, adjusted);
  const runWeek = Number(/\d+/.exec(data.runName)?.[0] ?? 45);
  const practiceRows = headlineRows(loadFireDrillData());
  const ringfenceRow = practiceRows.find((r) => r.gate === "Ringfence");
  const views: Record<string, RuleView> = {};

  // The starter rule (engine S-01): what it paused in this run is the graph's own groups.
  const graphGroups = data.cases.filter((c) => c.kind === "group" && !c.id.includes(":"));
  const fraud = graphGroups.filter((c) => c.verdict === "fraud");
  const real = graphGroups.filter((c) => c.verdict === "real");
  const sum = (cs: typeof graphGroups) => cs.reduce((a, c) => a + c.size, 0);
  const names = (cs: typeof graphGroups) => cs.map((c) => c.name).filter(Boolean).join(", ");
  views.starter = {
    kicker: "STARTER RULE · INCLUDED WITH EVERY PROGRAM · S-01",
    name: "Linked groups with a warning sign",
    plain: "Pause a group of 3 or more linked accounts when any of them shows a warning sign. A group of 2 is paused only if both do.",
    chips: ["SHARED DEVICE OR PAYOUT EMAIL", "SIGN-UP UNDER 2 MIN", "NO ACTIVITY AFTER", "THROWAWAY EMAIL"],
    listEffect: { on: `On · paused ${sum(graphGroups)} this week`, off: "Off · pauses nothing", waiting: "" },
    effectLabel: `IN THIS RUN · ${data.runName.toUpperCase()}`,
    simulated: false,
    stats: [
      { n: String(sum(graphGroups)), label: "payouts paused by this rule" },
      { n: String(sum(fraud)), label: `that look like fraud${names(fraud) ? ` (${names(fraud)})` : ""}` },
      { n: String(sum(real)), label: `that look like real people${names(real) ? ` (${names(real)})` : ""}` },
    ],
    sampleLabel: "Some of the accounts it paused",
    sample: [...(fraud[0]?.members.slice(0, 2) ?? []).map((m) => ({ m, tag: fraud[0]!.name ?? "" })), ...(real[0]?.members.slice(0, 1) ?? []).map((m) => ({ m, tag: real[0]!.name ?? "" }))]
      .map(({ m, tag }) => ({ a: m.accountId, b: signed(m.signupAt), c: m.receiver, tag })),
    testHead: "This is the rule the comparison above tests",
    testPct: 100,
    testNote: `Its results are the "Ringfence" row at the top of this page: ${usd(ringfenceRow?.leakedPer1000Usd ?? 0)} lost and ${fewer(ringfenceRow?.honestHeld ?? 0)} real member paused per 1,000 test payouts.`,
    origin: [
      { k: "Comes with", v: "Every Ringfence program" },
      { k: "Looks at", v: "Who shares a device, payout email or network" },
      { k: "Can't catch", v: "Accounts that share no device, payout email or network" },
    ],
    offWarn: `It's the rule that caught ${names(fraud) || "this run's linked groups"}. With it off, groups like that would be paid out from the next run, unless a learned rule catches them. Payouts it already paused stay in Decisions.`,
  };

  // The rule learned from Group 12, and its wider revision (week 2 on), from the walkthrough's learning.
  const learning = week >= 1 ? buildR12Learning(loadWeekRun(1), loadWeekTruth(1)) : null;
  if (learning) {
    const cond = (rule: typeof learning.rule, signal: string) => rule.when.all.find((c) => c.signal === signal);
    const burst = cond(learning.rule, "signup_burst");
    const minAccounts = burst?.min_accounts ?? 0;
    const window1 = burst?.window_min ?? 0;
    const maxSeconds = cond(learning.rule, "onboarding_seconds")?.max ?? 0;
    const rt = learning.rule.red_team!;
    const week2Run = loadWeekRun(2);
    const week2Truth = loadWeekTruth(2);
    const week2Ring = week2Run.items.filter((it) => week2Truth.find((l) => l.sender_item_id === it.sender_item_id)?.group === "ring");
    const heldByOthers = new Set(scoreRun(week2Run).decisions.filter((d) => d.decision === "HOLD").map((d) => d.sender_item_id));
    const onlyThis = week2Ring.filter((it) => !heldByOthers.has(it.sender_item_id)).length;
    const pastWeek45 = learning.ring.member_sender_item_ids.length;
    const week44Ring = loadWeekTruth(0).filter((l) => l.group === "ring").length;
    const chips = (window: number) => ["SAME REFERRER", `${minAccounts}+ ACCOUNTS`, `WITHIN ${window} MIN`, `SIGN-UP UNDER ${maxSeconds}S`, "NO ACTIVITY AFTER"];

    views["referral-bursts"] = {
      kicker: `LEARNED RULE · FROM GROUP 12 · ${learning.rule.id}`,
      name: "Referral bursts",
      plain: `Pause payouts when ${minAccounts} or more people referred by the same account sign up within ${window1} minutes, each finishes sign-up in ${maxSeconds} seconds or less, and none does anything afterwards.`,
      chips: chips(window1),
      listEffect: { on: "On · learned from Group 12", off: "Off · pauses nothing", waiting: `Off · would pause ${week2Ring.length} next run` },
      effectLabel: "IN THE NEXT RUN, IF ON · WEEK 46",
      simulated: true,
      stats: [
        { n: String(week2Ring.length), label: `payouts it would pause, ${usd(week2Ring.reduce((a, it) => a + Number(it.amount.value), 0))}` },
        { n: String(onlyThis), label: "that no other rule catches" },
        { n: String(week2Truth.filter((l) => l.group === "honest").length), label: "members still paid on time" },
      ],
      sampleLabel: "Some of the accounts it would pause. Each uses its own device and network, so no other rule links them.",
      sample: week2Ring.slice(0, 3).map((it) => ({ a: it.context.account_id, b: signed(it.context.signup_at), c: it.receiver, tag: it.context.device_hash })),
      footnote: `The walkthrough's Week 46 outcome, not a replay: this exact version needs ${minAccounts} accounts in one burst, so by itself it would pause none of these ${week2Ring.length}.`,
      testHead: `Caught ${rt.caught} of ${rt.variants} disguised copies of Group 12`,
      testPct: Math.round((rt.caught / rt.variants) * 100),
      testNote: `On past runs it would have caught ${pastWeek45}: the ${pastWeek45} paused in Week 45. The ${week44Ring} paid in Week 44 were fewer than its ${minAccounts}-account minimum. The ${rt.misses.length} disguises it missed are saved, and the next version has to answer for them.`,
      origin: [
        { k: "Learned from", v: `Group 12 · ${pastWeek45} accounts · Week 45` },
        { k: "Written by", v: "Ringfence investigator, every finding re-checked" },
        { k: "Needs", v: "Your approval. Nothing runs until you turn it on" },
      ],
      offWarn: `It's the only rule that catches referral bursts like Group 12. With it off, those ${week2Ring.length} payouts would go out in the next run (Week 46). Payouts it already paused stay in Decisions.`,
    };

    if (learning.revised) {
      const window2 = cond(learning.revised, "signup_burst")?.window_min ?? window1;
      const rt2 = learning.revised.red_team!;
      const open = learning.openCases.length;
      const closed = learning.closedCount;
      views["referral-bursts-v2"] = {
        kicker: `LEARNED RULE · VERSION 2 · ${learning.revised.id}`,
        name: "Referral bursts, wider window",
        plain: `Same as Referral bursts, but with a wider sign-up window (${window1} → ${window2} minutes), so slower, more careful bursts are caught too.`,
        chips: chips(window2),
        listEffect: { on: "On · wider window", off: "Off · pauses nothing", waiting: `Off · would close ${closed} more` },
        effectLabel: "REPLAYED ON THE DISGUISES VERSION 1 MISSED",
        simulated: false,
        stats: [
          { n: String(open), label: "disguises that beat version 1" },
          { n: String(closed), label: "this version would pause" },
          { n: String(open - closed), label: "that still get through" },
        ],
        sampleLabel: "Some of the saved disguises it now catches",
        sample: learning.cases.filter((c) => c.status === "closed").slice(0, 3).map((c) => ({
          a: c.id, b: `${Math.round(c.attempt.signup_spread_minutes)}-min burst`, c: `${c.attempt.onboarding_seconds}s sign-up · ${c.attempt.activity_after_onboarding} actions`, tag: "Caught",
        })),
        testHead: `Closes ${closed} of ${open} saved disguises`,
        testPct: Math.round((closed / open) * 100),
        testNote: `We replayed the exact disguises version 1 missed. A ${window2}-minute window closes ${closed}. The other ${open - closed} go further than this covers, so they stay open until Ringfence finds a new signal. On a fresh batch it catches ${rt2.caught} of ${rt2.variants}, against version 1's ${rt.caught}.`,
        origin: [
          { k: "Learned from", v: "Disguises that slipped past Referral bursts" },
          { k: "Builds on", v: "Referral bursts (version 1). Each has its own switch" },
          { k: "Ringfence's read", v: `Better, not finished: ${open - closed} still get through` },
        ],
        offWarn: `With it off, the ${closed} slower bursts it catches would go out from Week 47, unless version 1 catches them. Payouts it already paused stay in Decisions.`,
      };
    }
  }

  return {
    data,
    nextRun: `Week ${runWeek + 1}`,
    starter: { key: "starter", name: "Linked groups with a warning sign", base: "on", wouldPause: 0, nextRun: `Week ${runWeek + 1}` },
    views,
    practice: practiceRows.map((r) => ({
      approach: r.gate === "no gate" ? "No checks" : r.gate === "per-request gate" ? "Checking each payment alone" : "Ringfence (starter rule)",
      lost: usd(r.leakedPer1000Usd),
      paused: fewer(r.honestHeld),
      strong: r.gate === "Ringfence",
    })),
  };
}
