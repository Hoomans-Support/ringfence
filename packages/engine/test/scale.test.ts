import { describe, expect, it } from "vitest";
import { scoreRun } from "../src";
import { createSyntheticRingRun } from "./synthetic-run";

const PAYEES = 15_000;
const RINGS = 40;
const RING_SIZE = 23;

describe("scoreRun scale target", () => {
  it("scores 15,000 payees containing 40 seeded rings in under 10 seconds", () => {
    const run = createSyntheticRingRun({ totalPayees: PAYEES, ringCount: RINGS, ringSize: RING_SIZE });
    const start = performance.now();
    const result = scoreRun(run);
    const elapsedMs = performance.now() - start;

    expect(result.decisions).toHaveLength(PAYEES);
    expect(result.rings).toHaveLength(RINGS);
    expect(result.rings.every((ring) => ring.size === RING_SIZE)).toBe(true);
    expect(elapsedMs).toBeLessThan(10_000);
  }, 15_000);
});
