import { describe, expect, it } from "vitest";
import { buildControlTowerSources, type PayoutRow } from "../lib/control-tower-data";

const sum = (rows: PayoutRow[], key: "paid" | "paused" | "kept" | "leaked" | "mistaken") => rows.reduce((a, r) => a + r[key], 0);

describe("buildControlTowerSources", () => {
  it("gives AG Studio week 1's real split: 387 paid, 25 paused, $460 kept, 2 real people paused", () => {
    const { payouts, holds } = buildControlTowerSources(1, false);
    expect([payouts.length, sum(payouts, "paid"), sum(payouts, "paused"), sum(payouts, "kept"), sum(payouts, "leaked"), sum(payouts, "mistaken")]).toEqual([412, 387, 25, 460, 0, 2]);
    expect(holds).toHaveLength(25);
    expect(new Set(holds.map((h) => h.group))).toEqual(new Set(["Group 12", "Group 13"]));
  });

  it("charts every payout run up to this week: Week 44 leaked $180 before Ringfence, Week 45 kept $460", () => {
    expect(buildControlTowerSources(1, false).history.map(({ run, kept, leaked }) => [run, kept, leaked])).toEqual([
      ["Week 44", 0, 180],
      ["Week 45", 460, 0],
    ]);
    expect(buildControlTowerSources(4, false).history.map((h) => h.run)).toEqual(["Week 44", "Week 45", "Week 47", "Week 48"]);
  });
});
