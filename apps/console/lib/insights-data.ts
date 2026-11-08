// Insights' one AG Studio data source: every payout in every payout run up to the demo week, so
// Studio's own data engine can total, chart, pivot and filter them however the viewer likes. Each
// row carries the Decisions page's own decision for it (lib/demo.ts), and the fixture's labels say
// which payouts were truly fraud, so a paused one was kept, a paid one leaked, and either way we
// know which part of Ringfence (if any) stopped it.
import type { DemoCase } from "@/app/demo-store";
import { buildDemo } from "./demo";
import { loadWeekRun, loadWeekTruth, type DemoWeek } from "./fixtures";
import { maskEmail } from "@ringfence/engine";

export interface InsightRow {
  run: string;
  /** The run's week number, for ordering runs on a chart axis. */
  order: number;
  outcome: string;
  /** Which part of Ringfence stopped a fraud payout ("Missed" if none did), or "Not fraud". */
  caughtBy: string;
  group: string;
  account: string;
  payout: string;
  device: string;
  amount: number;
  /** 1/0 flags, so a widget can count them with a plain sum or filter on them. */
  count: number;
  paid: number;
  paused: number;
  fraud: number;
  mistaken: number;
  /** The same split as `caughtBy`, one 1/0 measure per part: a chart plotting these four gets its
   *  series in this fixed order (and so fixed theme colours), whatever is filtered out. */
  byEngine: number;
  byRule: number;
  byNetwork: number;
  missed: number;
  /** Fraud money: kept back (paused), let through (paid), or at stake either way. */
  kept: number;
  leaked: number;
  atStake: number;
}

function caughtBy(c: DemoCase | undefined, isFraud: boolean): string {
  if (!isFraud) return "Not fraud";
  if (!c) return "Missed";
  if (c.id.startsWith("rule:")) return "Learned rule";
  if (c.id.startsWith("network:")) return "Another program's ring";
  return "Linked-group engine";
}

function rowsFor(week: DemoWeek, adjusted: boolean): InsightRow[] {
  const demo = buildDemo(week, adjusted);
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const fraud = new Set(loadWeekTruth(outcomeWeek).filter((l) => l.group === "ring" || l.group === "ring_match").map((l) => l.sender_item_id));
  const pausedIn = new Map<string, DemoCase>();
  for (const c of demo.cases) if (c.kind === "group") for (const m of c.members) pausedIn.set(m.itemId, c);
  const order = Number(/\d+/.exec(demo.runName)?.[0] ?? 0);
  const run = week === 0 ? `${demo.runName} · before Ringfence` : week === 4 ? `${demo.runName} · survey app` : demo.runName;
  return loadWeekRun(outcomeWeek).items.map((it) => {
    const c = pausedIn.get(it.sender_item_id);
    const usd = Number(it.amount.value);
    const isFraud = fraud.has(it.sender_item_id);
    const by = caughtBy(c, isFraud);
    return {
      run, order,
      outcome: !c ? "Succeeded" : c.verdict === "fraud" ? "Paused · likely fraud" : "Paused · likely real",
      caughtBy: by,
      group: c ? (c.name ?? c.title) : "Not paused",
      account: it.context.account_id, payout: maskEmail(it.receiver), device: it.context.device_hash,
      amount: usd, count: 1,
      paid: c ? 0 : 1, paused: c ? 1 : 0, fraud: isFraud ? 1 : 0, mistaken: c && !isFraud ? 1 : 0,
      byEngine: by === "Linked-group engine" ? 1 : 0, byRule: by === "Learned rule" ? 1 : 0,
      byNetwork: by === "Another program's ring" ? 1 : 0, missed: by === "Missed" ? 1 : 0,
      kept: c && isFraud ? usd : 0, leaked: !c && isFraud ? usd : 0, atStake: isFraud ? usd : 0,
    };
  });
}

/** Every payout run of the walkthrough up to this week (week 2 reviews week 1's run, adding none). */
export function buildInsightRows(week: DemoWeek, adjusted: boolean): InsightRow[] {
  const current = Number(/\d+/.exec(buildDemo(week, adjusted).runName)?.[0] ?? 0);
  return ([0, 1, 3, 4] as const).flatMap((w) => rowsFor(w, adjusted)).filter((r) => r.order <= current);
}
