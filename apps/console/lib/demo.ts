// One place that turns a demo week's fixture run into what the designer's screens show: the run's
// split, the cases waiting for a decision (paused groups and paid "second looks") and the learned
// rules. The per-week decisions are the review queue's own (same scoreRun, same learned-rule and
// network-match overrides), only reshaped. Fixtures never change, so each week is built once.
import { applyRule } from "@ringfence/agents";
import { scoreRun, type ItemDecision, type PayoutItem } from "@ringfence/engine";
import type { DemoCase, DemoRule, DemoWeekIndex, IconKey, Verdict } from "@/app/demo-store";
import { loadWeekDemoMetadata, loadWeekRun, loadWeekTruth, type DemoWeek } from "./fixtures";
import { buildR12Learning } from "./learned-rule";

/** "Today" in each demo week (the Tuesday after its run), the same dates the top bar shows. */
export const DEMO_TODAY = ["2026-10-27", "2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"];

export interface DemoData {
  week: DemoWeek;
  adjusted: boolean;
  runId: string;
  runName: string;
  /** The small line above a page's headline: which run this is (week 2 reviews week 1's run). */
  kicker: string;
  today: string;
  payees: number;
  totalUsd: number;
  paid: number;
  paidUsd: number;
  cases: DemoCase[];
  rules: DemoRule[];
  /** A sentence about where this week sits in the story, when there's more to say than the cases. */
  note?: string;
  network?: { accounts: number; source: string };
}

const HOLD_DAYS = 7;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const amount = (items: PayoutItem[]) => items.reduce((sum, it) => sum + Number(it.amount.value), 0);
const runName = (runId: string) => `Week ${Number(/w(\d+)$/.exec(runId)?.[1] ?? 0)}`;

/** Ringfence's read of a set of accounts: quiet after sign-up looks like one operator. */
function verdictOf(items: PayoutItem[]): Verdict {
  const quiet = items.filter((it) => it.context.activity_after_onboarding === 0).length;
  return quiet * 2 >= items.length ? "fraud" : "real";
}

/** The facts chips under a case's title, from what its accounts actually share. */
function factsOf(items: PayoutItem[]): DemoCase["facts"] {
  const facts: DemoCase["facts"] = [];
  const n = items.length;
  const referrers = new Set(items.map((it) => it.context.referrer_id));
  const byDevice = new Map<string, number>();
  for (const it of items) byDevice.set(it.context.device_hash, (byDevice.get(it.context.device_hash) ?? 0) + 1);
  const shared = [...byDevice.values()].filter((count) => count > 1).length;
  const times = items.map((it) => Date.parse(it.context.signup_at));
  const spanMin = Math.round((Math.max(...times) - Math.min(...times)) / 60_000);
  const add = (icon: IconKey, text: string) => facts.push({ icon, text });

  if (referrers.size === 1 && n > 2) add("person", "1 referrer");
  if (shared > 0) add("device", `${shared} shared device${shared === 1 ? "" : "s"}`);
  else if (n > 2) add("device", `${byDevice.size} different devices`);
  if (n === 2) add("clock", `${Math.round(spanMin / 60)} hours apart`);
  else if (spanMin < 120) add("clock", `${spanMin}-min burst`);
  if (items.every((it) => (it.context.activity_after_onboarding ?? 0) > 0)) add("active", n === 2 ? "Both active after" : "All active after");
  return facts.slice(0, 3);
}

function build(week: DemoWeek, adjusted: boolean): DemoData {
  // Exactly the review queue's decisions for this week (app/review/page.tsx).
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const run = loadWeekRun(outcomeWeek);
  const truth = loadWeekTruth(outcomeWeek);
  const scored = scoreRun(run);
  const learning = week >= 1 ? buildR12Learning(loadWeekRun(1), loadWeekTruth(1)) : null;
  const selectedRule = learning ? (adjusted && learning.revised ? learning.revised : learning.rule) : null;
  const learnedMatches = week === 3 && selectedRule ? new Set(applyRule(selectedRule, run)) : new Set<string>();
  const networkMatches = new Set(week === 4 ? loadWeekTruth(4).filter((l) => l.group === "ring_match").map((l) => l.sender_item_id) : []);
  const ruleGroup = `rule:${selectedRule?.id ?? "R-07"}`;
  const decisions: ItemDecision[] = scored.decisions.map((d) => {
    if (week === 0) return { ...d, decision: "PAY" };
    if (week === 3 && learnedMatches.has(d.sender_item_id)) return { ...d, decision: "HOLD", ring_id: undefined, hold_group_id: ruleGroup, reasons: ["learned rule"] };
    if (week === 4 && networkMatches.has(d.sender_item_id)) return { ...d, decision: "HOLD", ring_id: undefined, hold_group_id: "network:R-12", reasons: ["network_match"] };
    return d;
  });

  const itemById = new Map(run.items.map((it) => [it.sender_item_id, it]));
  const items = (ids: Iterable<string>) => [...ids].map((id) => itemById.get(id)).filter((it): it is PayoutItem => Boolean(it));
  const today = DEMO_TODAY[week]!;
  const runLabel = runName(run.sender_batch_header.sender_batch_id);

  // Paused groups, keyed the way the review queue groups them; a ring takes its story number
  // (R-12 -> Group 12) and pairs number on from there, as the designer's Group 13 does.
  const held = decisions.filter((d) => d.decision === "HOLD");
  const groups = new Map<string, string[]>();
  for (const d of held) {
    const key = d.ring_id ?? d.hold_group_id ?? d.sender_item_id;
    groups.set(key, [...(groups.get(key) ?? []), d.sender_item_id]);
  }
  const ringNumber = (members: PayoutItem[]) => {
    const accounts = new Set(members.map((it) => it.context.account_id));
    const label = truth.find((t) => accounts.has(t.account_id) && t.ring_label)?.ring_label;
    return label ? Number(/R-(\d+)/.exec(label)?.[1]) || undefined : undefined;
  };
  let nextNumber = 0;
  const groupCases: DemoCase[] = [...groups].map(([key, ids]) => {
    const members = items(ids);
    const isRing = Boolean(held.find((d) => d.sender_item_id === ids[0])?.ring_id);
    const n = members.length;
    const total = amount(members);
    const verdict = verdictOf(members);
    const dueAt = new Date(Math.min(...members.map((it) => Date.parse(it.context.signup_at))) + HOLD_DAYS * 86_400_000).toISOString();
    let number = isRing ? ringNumber(members) : undefined;
    if (number) nextNumber = Math.max(nextNumber, number + 1);
    if (key.startsWith("P-") && nextNumber) number = nextNumber++;
    const name = number ? `Group ${number}` : undefined;
    const base = { kind: "group" as const, size: n, usd: total, dueAt, recoverableUsd: 0, verdict, hint: `Not fraud pays it · Fraud keeps ${usd(total)} unpaid` };
    if (key.startsWith("rule:")) {
      return { ...base, id: key, name: "Referral bursts group", label: "HELD BY A LEARNED RULE", title: `${n} accounts caught by Referral bursts`, facts: factsOf(members) };
    }
    if (key.startsWith("network:")) {
      // Already confirmed as fraud at another program, so that's Ringfence's read here too.
      return { ...base, verdict: "fraud" as const, id: key, name: "Group 12 matches", label: "MATCHES GROUP 12", title: `${n} accounts using Group 12's devices`,
        facts: [{ icon: "shield" as const, text: "Seen at BudgetApp" }, ...factsOf(members)].slice(0, 3) };
    }
    const title = verdict === "fraud" ? `${n} accounts, one person` : `${n} accounts, ${n} people`;
    return { ...base, id: key, name, label: name?.toUpperCase() ?? key, title, facts: factsOf(members) };
  });

  // Paid, but worth a second look: they share a link with a paused group, or only a referrer.
  const seconds: DemoCase[] = [];
  const group12 = groupCases.find((c) => c.name === "Group 12");
  if (outcomeWeek === 1 && group12) {
    const earlier = loadWeekRun(0);
    const earlierRing = new Set(loadWeekTruth(0).filter((l) => l.group === "ring").map((l) => l.sender_item_id));
    const linked = earlier.items.filter((it) => earlierRing.has(it.sender_item_id));
    const devices = new Set(linked.map((it) => it.context.device_hash));
    const total = amount(linked);
    seconds.push({
      id: "second:w44", kind: "second", label: `SECOND LOOK · PAID ${runName(earlier.sender_batch_header.sender_batch_id).toUpperCase()}`,
      title: `${linked.length} accounts linked to Group 12`, verdict: verdictOf(linked), size: linked.length, usd: total,
      facts: [{ icon: "device", text: `Same ${devices.size} devices` }, { icon: "person", text: "Same referrer" }, { icon: "clock", text: `Paid in ${runName(earlier.sender_batch_header.sender_batch_id)}` }],
      // The fixtures carry no claim status; this split is the designer's example.
      moneyNote: "$80 still recoverable", recoverableUsd: 80,
      hint: "Not fraud stops flags · Fraud recovers $80 and pauses them",
    });
    // The coworkers: one referrer and nothing else, which the engine rightly paid. Picked by their
    // fixture label, as the week 2 review picks its misses: every honest referrer brings dozens of
    // accounts, so "shares a referrer" alone can't tell this group apart.
    const coworkers = items(truth.filter((l) => l.group === "coworkers").map((l) => l.sender_item_id));
    if (coworkers.length > 0) {
      seconds.push({
        id: "second:coworkers", kind: "second", label: `SECOND LOOK · PAID ${runLabel.toUpperCase()}`,
        title: `${coworkers.length} accounts, one referrer`, verdict: verdictOf(coworkers), size: coworkers.length, usd: amount(coworkers),
        facts: factsOf(coworkers), moneyNote: "Paid · all collected", recoverableUsd: 0,
        hint: "Not fraud stops flags like this · Fraud pauses future payouts",
      });
    }
  }
  if (week === 3) {
    const slipped = items(truth.filter((l) => l.group === "ring").map((l) => l.sender_item_id))
      .filter((it) => decisions.find((d) => d.sender_item_id === it.sender_item_id)?.decision === "PAY");
    if (slipped.length > 0) {
      seconds.push({
        id: "second:slipped", kind: "second", label: `SECOND LOOK · PAID ${runLabel.toUpperCase()}`,
        title: `${slipped.length} accounts linked to Group 12`, verdict: verdictOf(slipped), size: slipped.length, usd: amount(slipped),
        facts: factsOf(slipped), moneyNote: "Paid this run", recoverableUsd: 0,
        hint: "Not fraud stops flags like this · Fraud pauses future payouts",
      });
    }
  }

  // Learned rules. The rule exists once Group 12 is marked as fraud (week 1); week 2 starts with it
  // on and asks about its wider revision, which is the walkthrough's real `adjusted` state.
  const rules: DemoRule[] = [];
  if (learning) {
    const week2Ring = loadWeekTruth(2).filter((l) => l.group === "ring").length;
    rules.push({
      key: "referral-bursts", name: "Referral bursts", fromCase: week === 1 ? group12?.id : undefined, fromName: "Group 12",
      base: week === 1 ? "waiting" : "on",
      // The Week 46 fixture's 18 isolated ring accounts, which the walkthrough presents as held by
      // this rule (the ring detail page's week 2 says the same); a fixture claim, not a live replay.
      wouldPause: week2Ring, nextRun: "Week 46",
    });
    if (week >= 2 && learning.revised) {
      rules.push({
        key: "referral-bursts-v2", name: "Referral bursts, wider window", after: "referral-bursts",
        base: adjusted ? "on" : week === 2 ? "waiting" : "off",
        wouldPause: learning.closedCount, nextRun: "Week 47",
        onQuery: week === 2 ? "week=2&adjusted=1" : undefined,
      });
    }
  }

  const paid = decisions.filter((d) => d.decision === "PAY");
  const truthByItem = new Map(truth.map((l) => [l.sender_item_id, l]));
  const falseHolds = scored.decisions.filter((d) => d.decision === "HOLD" && truthByItem.get(d.sender_item_id)?.group !== "ring").length;
  const missed = scored.decisions.filter((d) => d.decision === "PAY" && truthByItem.get(d.sender_item_id)?.group === "ring").length;
  const recovery = week === 4 ? loadWeekDemoMetadata(4)?.recovery : undefined;
  const note = week === 0
    ? "Ringfence isn't running yet: every payee was paid, including 9 accounts that come back next week as Group 12."
    : week === 2
      ? `Reviewing Week 45 before the Week 46 run: ${falseHolds} paused payouts were real people and ${missed} ring payouts were missed.`
      : week === 3
        ? adjusted
          ? "Group 12 came back with fresh accounts. The wider rule you turned on in week 2 runs this week; some disguises still get through."
          : "Group 12 came back with fresh accounts. The wider rule wasn't turned on in week 2, so the same disguises still get through."
        : week === 4
          ? `This is the survey app's run. Week 45's ${recovery?.sender_item_ids.length ?? 0} paused Group 12 payouts were cancelled while unclaimed, ${usd(recovery?.amount_usd ?? 0)} back (a fixture outcome, not a live cancellation).`
          : undefined;

  return {
    week, adjusted, runId: run.sender_batch_header.sender_batch_id, runName: runLabel, today,
    kicker: week === 2
      ? `REVIEWING ${runLabel.toUpperCase()} · BEFORE THE WEEK 46 RUN`
      : `PAYOUT RUN · ${runLabel.toUpperCase()} · ${usd(amount(run.items))}`,
    payees: run.items.length, totalUsd: amount(run.items), paid: paid.length, paidUsd: amount(items(paid.map((d) => d.sender_item_id))),
    cases: [...groupCases, ...seconds], rules, note,
    network: week === 4 ? { accounts: networkMatches.size, source: "Group 12" } : undefined,
  };
}

const cache = new Map<string, DemoData>();
export function buildDemo(week: DemoWeek, adjusted: boolean): DemoData {
  const key = `${week}${adjusted ? "a" : ""}`;
  let data = cache.get(key);
  if (!data) cache.set(key, (data = build(week, adjusted)));
  return data;
}

/** What the top bar's counts need for every week, built once per server process. */
export function demoIndex(): Record<string, DemoWeekIndex> {
  const out: Record<string, DemoWeekIndex> = {};
  for (const week of [0, 1, 2, 3, 4] as const) {
    for (const adjusted of [false, true]) {
      const d = buildDemo(week, adjusted);
      out[`${week}${adjusted ? "a" : ""}`] = { runId: d.runId, caseIds: d.cases.map((c) => c.id), rules: d.rules };
    }
  }
  return out;
}
