// The Decided history: the designer's EXAMPLE rows (made-up decisions by Budi's team in Weeks 42-44,
// always labelled as examples on screen) plus whatever is decided in this session. The Overview's
// record card and the Decided tab both read their totals from here, so they always agree.
import type { DemoCase, Verdict } from "@/app/demo-store";

export interface HistoryRow {
  title: string;
  sub: string;
  run: string;
  read: Verdict;
  decision: string;
  by: string;
  when: string;
  money: string;
  chip: "done" | "waiting" | "neutral";
  agreed: boolean;
  kept: number;
  recovered: number;
  lost: number;
  kind: "group" | "second";
  example: boolean;
  caseId?: string;
}

export const EXAMPLE_HISTORY: HistoryRow[] = [
  { title: "Group 11 · 2 accounts", sub: "1 shared tablet", run: "Wk 44", read: "real", decision: "Not fraud · released", by: "Rina", when: "Thu 29 Oct, 16:40", money: "$40 sent · Unclaimed", chip: "waiting", agreed: true, kept: 0, recovered: 0, lost: 0, kind: "group", example: true },
  { title: "3 accounts, one referrer", sub: "Paid, second look", run: "Wk 43", read: "real", decision: "Not fraud · left paid", by: "Rina", when: "Thu 22 Oct, 11:05", money: "$60 sent · Collected", chip: "neutral", agreed: true, kept: 0, recovered: 0, lost: 0, kind: "second", example: true },
  { title: "Group 10 · 11 accounts", sub: "1 payout email · 2 devices", run: "Wk 43", read: "fraud", decision: "Fraud · kept unpaid", by: "Dimas", when: "Wed 21 Oct, 09:30", money: "$60 recovered", chip: "neutral", agreed: true, kept: 220, recovered: 60, lost: 0, kind: "group", example: true },
  { title: "Group 9 · 2 accounts", sub: "1 shared device", run: "Wk 42", read: "fraud", decision: "Not fraud · released", by: "Rina", when: "Thu 15 Oct, 14:12", money: "$40 sent · Collected", chip: "neutral", agreed: false, kept: 0, recovered: 0, lost: 0, kind: "group", example: true },
  { title: "Group 8 · 6 accounts", sub: "1 referrer · 1 device", run: "Wk 42", read: "fraud", decision: "Fraud · kept unpaid", by: "Rina", when: "Wed 14 Oct, 10:02", money: "$120 kept", chip: "done", agreed: true, kept: 120, recovered: 0, lost: 0, kind: "group", example: true },
];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** One row for a case decided in this session. */
export function liveRow(c: DemoCase, verdict: Verdict, runName: string): HistoryRow {
  const base = { title: c.name ? `${c.name} · ${c.size} accounts` : c.title, sub: c.kind === "second" ? "Paid, second look" : c.facts.map((f) => f.text).slice(0, 2).join(" · "),
    run: runName.replace("Week", "Wk"), read: c.verdict, by: "Budi (you)", when: "Just now", agreed: c.verdict === verdict, kind: c.kind, example: false, caseId: c.id };
  if (c.kind === "group") {
    return verdict === "fraud"
      ? { ...base, decision: "Fraud · kept unpaid", money: `${usd(c.usd)} kept`, chip: "done", kept: c.usd, recovered: 0, lost: 0 }
      : { ...base, decision: "Not fraud · released", money: `${usd(c.usd)} · Sending`, chip: "waiting", kept: 0, recovered: 0, lost: 0 };
  }
  return verdict === "fraud"
    ? { ...base, decision: c.recoverableUsd ? "Fraud · recovering" : "Fraud · future payouts paused", money: c.recoverableUsd ? `Recovering ${usd(c.recoverableUsd)}` : `${usd(c.usd)} already collected`,
        chip: c.recoverableUsd ? "waiting" : "neutral", kept: 0, recovered: c.recoverableUsd, lost: c.usd - c.recoverableUsd }
    : { ...base, decision: "Not fraud · left paid", money: `${usd(c.usd)} sent · Collected`, chip: "neutral", kept: 0, recovered: 0, lost: 0 };
}

export function historyStats(rows: HistoryRow[]) {
  const agreed = rows.filter((r) => r.agreed).length;
  return {
    decided: rows.length,
    runs: new Set(rows.map((r) => r.run)).size,
    agreed,
    overruled: rows.length - agreed,
    kept: rows.reduce((sum, r) => sum + r.kept, 0),
    recovered: rows.reduce((sum, r) => sum + r.recovered, 0),
    lost: rows.reduce((sum, r) => sum + r.lost, 0),
  };
}
