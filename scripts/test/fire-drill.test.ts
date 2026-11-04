// The fire drill as a CI check (FR-23): fails if Ringfence stops beating either other gate on the
// two numbers that matter. The PRD's own targets are at least 90% less leaked and under 1% of
// honest members held; the second is measured at about 1.1% today (every one a shared-device pair,
// see docs/fire-drill.md), so the bound below guards against regressions rather than claiming 1%.
import { describe, expect, it } from "vitest";
import { drill, generateProgram } from "../fire-drill";

describe("fire drill", () => {
  it("builds the program it says: 1,000 payees, 5% of them ring accounts, the same every time", () => {
    const a = generateProgram({ seed: 7 });
    expect(a.run.items).toHaveLength(1000);
    expect(a.ring.size).toBe(50);
    expect(generateProgram({ seed: 7 })).toEqual(a);
  });

  it("at a 5% ring share, Ringfence leaks at least 90% less than no gate and holds far fewer honest members than a per-request gate", () => {
    const result = drill({ ringShare: 0.05 });
    expect(result.Ringfence.leaked_per_1000_usd).toBeLessThanOrEqual(result["no gate"].leaked_per_1000_usd * 0.1);
    expect(result.Ringfence.honest_held_pct).toBeLessThan(1.5);
    expect(result["per-request gate"].honest_held_pct).toBeGreaterThan(result.Ringfence.honest_held_pct * 10);
    expect(result.Ringfence.recall).toBeGreaterThanOrEqual(0.9);
  });

  it("when half the ring fakes activity, Ringfence still catches more of it than the per-request gate", () => {
    const result = drill({ ringShare: 0.05, evasion: 0.5 });
    expect(result.Ringfence.recall).toBeGreaterThan(result["per-request gate"].recall);
    expect(result.Ringfence.leaked_per_1000_usd).toBeLessThan(result["per-request gate"].leaked_per_1000_usd);
  });
});
