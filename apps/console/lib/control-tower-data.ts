// The control tower's AG Studio data sources: real rows that Studio's own data engine queries,
// filters and aggregates for its built-in widgets (KPI tiles, donut, column chart, grid, filter).
// Every row comes from the same decisions the Decisions page shows (lib/demo.ts); the fixture's
// labels say which payouts were truly fraud, so a paused one was kept and a paid one leaked.
import type { DemoCase } from "@/app/demo-store";
import { buildDemo } from "./demo";
import { loadWeekRun, loadWeekTruth, type DemoWeek } from "./fixtures";

export interface PayoutRow {
  run: string;
  status: string;
  group: string;
  account: string;
  payout: string;
  device: string;
  amount: number;
  /** 1/0 flags, so a KPI tile can count them with a plain sum. */
  paid: number;
  paused: number;
  mistaken: number;
  count: number;
  /** Fraud money this payout kept back (paused) or let through (paid). */
  kept: number;
  leaked: number;
}

export interface RunHistoryRow {
  run: string;
  order: number;
  kept: number;
  leaked: number;
}

function payoutRows(week: DemoWeek, adjusted: boolean): PayoutRow[] {
  const demo = buildDemo(week, adjusted);
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const fraud = new Set(loadWeekTruth(outcomeWeek).filter((l) => l.group === "ring" || l.group === "ring_match").map((l) => l.sender_item_id));
  const pausedIn = new Map<string, DemoCase>();
  for (const c of demo.cases) if (c.kind === "group") for (const m of c.members) pausedIn.set(m.itemId, c);
  return loadWeekRun(outcomeWeek).items.map((it) => {
    const c = pausedIn.get(it.sender_item_id);
    const usd = Number(it.amount.value);
    const isFraud = fraud.has(it.sender_item_id);
    return {
      run: demo.runName,
      status: !c ? "Paid on time" : c.verdict === "fraud" ? "Paused · likely fraud" : "Paused · likely real",
      group: c ? (c.name ?? c.title) : "Not paused",
      account: it.context.account_id,
      payout: it.receiver,
      device: it.context.device_hash,
      amount: usd,
      paid: c ? 0 : 1,
      paused: c ? 1 : 0,
      mistaken: c && !isFraud ? 1 : 0,
      count: 1,
      kept: c && isFraud ? usd : 0,
      leaked: !c && isFraud ? usd : 0,
    };
  });
}

/** This week's payouts, its paused accounts, and every payout run up to this week. */
export function buildControlTowerSources(week: DemoWeek, adjusted: boolean) {
  const payouts = payoutRows(week, adjusted);
  const current = buildDemo(week, adjusted).runName;
  const runNumber = (name: string) => Number(/\d+/.exec(name)?.[0] ?? 0);
  // The walkthrough's payout runs (week 2 reviews week 1's run rather than adding one).
  const history: RunHistoryRow[] = ([0, 1, 3, 4] as const)
    .map((w) => payoutRows(w, adjusted))
    .filter((rows) => runNumber(rows[0]!.run) <= runNumber(current))
    .map((rows) => ({
      run: rows[0]!.run,
      order: runNumber(rows[0]!.run),
      kept: rows.reduce((a, r) => a + r.kept, 0),
      leaked: rows.reduce((a, r) => a + r.leaked, 0),
    }));
  return { payouts, holds: payouts.filter((r) => r.paused), history };
}
