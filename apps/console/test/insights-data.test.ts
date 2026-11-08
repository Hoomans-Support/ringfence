import { describe, expect, it } from "vitest";
import { buildInsightRows, type InsightRow } from "../lib/insights-data";

const sum = (rows: InsightRow[], key: "kept" | "leaked" | "atStake" | "mistaken" | "paused") => rows.reduce((a, r) => a + r[key], 0);
const stoppedBy = (rows: InsightRow[]) => {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows.filter((x) => x.fraud)) (out[r.run] ??= {})[r.caughtBy] = (out[r.run]?.[r.caughtBy] ?? 0) + 1;
  return out;
};

describe("buildInsightRows", () => {
  it("covers every run up to week 1: Week 44 leaked the 9 before Ringfence, Week 45 kept the ring of 23", () => {
    const rows = buildInsightRows(1, false);
    expect(new Set(rows.map((r) => r.run))).toEqual(new Set(["Week 44 · before Ringfence", "Week 45"]));
    expect([sum(rows, "kept"), sum(rows, "leaked"), sum(rows, "atStake"), sum(rows, "mistaken")]).toEqual([460, 180, 640, 2]);
    expect(stoppedBy(rows)).toEqual({ "Week 44 · before Ringfence": { Missed: 9 }, "Week 45": { "Linked-group engine": 23 } });
  });

  it("by week 4, shows each part of Ringfence taking its turn, and what still got through", () => {
    expect(stoppedBy(buildInsightRows(4, false))).toEqual({
      "Week 44 · before Ringfence": { Missed: 9 },
      "Week 45": { "Linked-group engine": 23 },
      "Week 47": { "Learned rule": 23, Missed: 89 },
      "Week 48 · survey app": { "Another program's ring": 6 },
    });
  });

  it("gives every fraud payee exactly one of the four chart measures, and no one else any", () => {
    for (const r of buildInsightRows(4, false)) expect(r.byEngine + r.byRule + r.byNetwork + r.missed).toBe(r.fraud);
  });

  it("uses item-level outcomes and masks payout addresses in the Studio data source", () => {
    const rows = buildInsightRows(1, false);
    expect(rows.some((row) => row.outcome === "Succeeded")).toBe(true);
    expect(rows.some((row) => row.outcome === "Paid on time")).toBe(false);
    expect(rows.every((row) => !row.payout.includes("@"))).toBe(true);
  });
});
