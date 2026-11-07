import { describe, expect, it } from "vitest";
import { headlineRows, loadFireDrillData, parseFireDrillMarkdown } from "../lib/fire-drill-data";

const SAMPLE = `# Fire drill

**Headline, at an assumed 5% ring share:** Ringfence leaks $0 per 1,000 payouts.

### Sweep: ring share

| Ring share (assumed) | Gate | $ leaked per 1,000 payouts | Honest members held | Precision | Recall |
| --- | --- | ---: | ---: | ---: | ---: |
| 1% | no gate | $200 | 0.0 (0.00%) | 100.0% | 0.0% |
| 1% | per-request gate | $0 | 145.0 (14.65%) | 6.5% | 100.0% |
| 1% | Ringfence | $60 | 0.4 (0.04%) | 95.6% | 70.0% |
| 5% | no gate | $1000 | 0.0 (0.00%) | 100.0% | 0.0% |
| 5% | per-request gate | $0 | 136.4 (14.36%) | 26.9% | 100.0% |
| 5% | Ringfence | $0 | 0.8 (0.08%) | 98.5% | 100.0% |

### Sweep: ring accounts that fake activity and slow down onboarding, at 5% ring share

| Evading accounts | Gate | $ leaked per 1,000 payouts | Honest members held | Precision | Recall |
| --- | --- | ---: | ---: | ---: | ---: |
| 0% | no gate | $1000 | 0.0 (0.00%) | 100.0% | 0.0% |
| 25% | Ringfence | $96 | 1.2 (0.13%) | 97.5% | 90.4% |
`;

describe("parseFireDrillMarkdown", () => {
  it("parses every ring-share sweep row into its own gate and label", () => {
    const { ringShareSweep } = parseFireDrillMarkdown(SAMPLE);
    expect(ringShareSweep).toHaveLength(6);
    expect(ringShareSweep[0]).toEqual({
      label: "1%",
      gate: "no gate",
      leakedPer1000Usd: 200,
      honestHeld: 0,
      honestHeldPct: 0,
      precisionPct: 100,
      recallPct: 0,
    });
  });

  it("parses the evasion sweep into its own section, separate from the ring-share sweep", () => {
    const { evasionSweep } = parseFireDrillMarkdown(SAMPLE);
    expect(evasionSweep).toHaveLength(2);
    expect(evasionSweep.map((r) => r.label)).toEqual(["0%", "25%"]);
  });

  it("extracts the headline as exactly the three 5%-ring-share rows, one per gate", () => {
    const headline = headlineRows(parseFireDrillMarkdown(SAMPLE));
    expect(headline.map((r) => r.gate)).toEqual(["no gate", "per-request gate", "Ringfence"]);
    expect(headline.every((r) => r.label === "5%")).toBe(true);
  });
});

describe("loadFireDrillData", () => {
  it("parses the real, committed docs/fire-drill.md into 15 ring-share rows and 9 evasion rows", () => {
    const data = loadFireDrillData();
    expect(data.ringShareSweep).toHaveLength(15);
    expect(data.evasionSweep).toHaveLength(9);
  });

  it("finds a headline with Ringfence leaking no more than the no-gate baseline", () => {
    const [noGate, , ringfence] = headlineRows(loadFireDrillData());
    expect(ringfence!.leakedPer1000Usd).toBeLessThanOrEqual(noGate!.leakedPer1000Usd);
  });
});
