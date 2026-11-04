/**
 * Sensitivity checks from the post-task-10 roadmap: run detection at ring shares and seeds other
 * than the one each existing test hardcodes (15,000/40/23 in scale.test.ts; seed 42 everywhere
 * else), to catch a rule that only works at the exact numbers already checked in.
 */
import { describe, expect, it } from "vitest";
import { scoreRun } from "../src";
import { generateWeek1 } from "../../../scripts/demo-generator/src/week1";
import { createSyntheticRingRun } from "./synthetic-run";

describe("ring-share sensitivity", () => {
  const cases = [
    { label: "sparse: 1 ring in 2,000 payees (~1% ring share)", totalPayees: 2_000, ringCount: 1, ringSize: 23 },
    { label: "PRD scale: 40 rings in 15,000 payees (~6% ring share)", totalPayees: 15_000, ringCount: 40, ringSize: 23 },
    { label: "dense: 50 rings in 1,500 payees (~77% ring share)", totalPayees: 1_500, ringCount: 50, ringSize: 23 },
  ];

  for (const { label, totalPayees, ringCount, ringSize } of cases) {
    it(`finds every seeded ring at its correct size - ${label}`, () => {
      const run = createSyntheticRingRun({ totalPayees, ringCount, ringSize });
      const result = scoreRun(run);

      expect(result.decisions).toHaveLength(totalPayees);
      expect(result.rings).toHaveLength(ringCount);
      expect(result.rings.every((ring) => ring.size === ringSize)).toBe(true);
    });
  }
});

describe("seed sensitivity on Week 1's generator", () => {
  // Week 1's ring/roommate/coworker/honest counts are fixed by design (final-prd.docx's demo data
  // table); the seed only varies which device/timing/wording each member draws. These numbers
  // should hold exactly regardless of seed - if they don't, detection has quietly started relying
  // on something seed 42 happens to produce rather than the ring's actual structure.
  const seeds = [1, 7, 42, 2026, 99_999];

  for (const seed of seeds) {
    it(`holds the ring as one, the roommates as a pair, and pays the coworkers - seed ${seed}`, () => {
      const { run, truth } = generateWeek1(seed);
      const { decisions, rings } = scoreRun(run);

      expect(run.items).toHaveLength(412);

      const ring = rings.find((r) => r.size === 23);
      expect(ring).toBeDefined();

      const coworkerIds = new Set(truth.filter((label) => label.group === "coworkers").map((label) => label.sender_item_id));
      expect(coworkerIds.size).toBe(5);
      const coworkerDecisions = decisions.filter((d) => coworkerIds.has(d.sender_item_id));
      expect(coworkerDecisions.every((d) => d.decision === "PAY")).toBe(true);

      const heldCount = decisions.filter((d) => d.decision === "HOLD").length;
      expect(heldCount).toBe(25); // 23-account ring + the 2-account roommate pair
    });
  }
});
