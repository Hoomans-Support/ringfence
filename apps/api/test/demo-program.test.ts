// The demo program tells the PRD's story without an answer key: created the way the hosted app
// creates it at startup, its week 1 ring is R-12 and the rule learned from it is R-07.
import { describe, expect, it } from "vitest";
import { ensureProgram } from "../src/db";
import { ensureProgramFromEnv } from "../src/server";
import { fixture, setup, week1 } from "./helpers";

const R07 = { action: "HOLD", when: { all: [
  { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
  { signal: "onboarding_seconds", max: 120 },
  { signal: "activity_after_onboarding", max: 0 },
] } };
const hostedEnv = { RINGFENCE_PROGRAM_ID: "demo", RINGFENCE_API_KEY: "hosted-key", RINGFENCE_FIRST_RING_NUMBER: "12", RINGFENCE_FIRST_RULE_NUMBER: "7" };

/** Boots a fresh database the way the hosted app does, then plays weeks 1 and 2 of the demo. */
async function demoStory(env: Record<string, string> = hostedEnv, before?: (ctx: Awaited<ReturnType<typeof setup>>) => Promise<void>) {
  const ctx = await setup();
  await before?.(ctx);
  await ensureProgramFromEnv(ctx.db, env);
  const headers = { authorization: `Bearer ${env.RINGFENCE_API_KEY}` };
  const post = async (url: string, payload: object) => (await ctx.app.inject({ method: "POST", url, headers, payload })).json();

  const w1 = await post("/v1/payout-runs", week1);
  const ring = [...new Set(w1.decisions.map((d: { ring_id?: string }) => d.ring_id).filter(Boolean))];
  await post(`/v1/rings/${ring[0]}/confirm`, { run_id: "run_2026w45" });
  const rule = await post("/v1/rules", { rule: R07, learned_from: { ring_id: ring[0], run_id: "run_2026w45" } });
  await post(`/v1/rules/${rule.rule_id}/approve`, { approved_by: "rina@budgetapp.test", acknowledge_flags: true });
  const w2 = await post("/v1/payout-runs", fixture("week2"));
  return { ring, rule, w2 };
}

describe("the demo program", () => {
  it("created at startup from the hosted app's settings, its week 1 ring is R-12 and the rule learned from it R-07", async () => {
    const { ring, rule, w2 } = await demoStory();
    expect(ring).toEqual(["R-12"]);
    expect(rule).toMatchObject({ rule_id: "R-07", learned_from: { ring_id: "R-12", run_id: "run_2026w45" } });
    // Approving R-07 holds week 2's disguised accounts.
    expect(w2.rule_set_version).toBe("starter-1+R-07v1");
    expect(w2.summary).toMatchObject({ paid: 419, held: 18 });
    const held = w2.decisions.filter((d: { decision: string }) => d.decision === "HOLD");
    expect(held.every((d: { hold_group_id: string }) => d.hold_group_id === "rule:R-07")).toBe(true);
  });

  it("the hosted app's program already existed before the setting: the next boot moves its numbering forward to R-12 and R-07", async () => {
    const { ring, rule } = await demoStory(hostedEnv, (ctx) => ensureProgram(ctx.db, "demo", "Budgeting app", "hosted-key"));
    expect(ring).toEqual(["R-12"]);
    expect(rule.rule_id).toBe("R-07");
  });

  it("a program created without starting numbers still begins at ring R-01 and rule R-01", async () => {
    const { ring, rule } = await demoStory({ RINGFENCE_PROGRAM_ID: "real", RINGFENCE_API_KEY: "real-key" });
    expect(ring).toEqual(["R-01"]);
    expect(rule.rule_id).toBe("R-01");
  });

  it("starting numbers that aren't positive whole numbers are ignored", async () => {
    const { ring, rule } = await demoStory({ ...hostedEnv, RINGFENCE_FIRST_RING_NUMBER: "abc", RINGFENCE_FIRST_RULE_NUMBER: "0" });
    expect(ring).toEqual(["R-01"]);
    expect(rule.rule_id).toBe("R-01");
  });

  it("a fresh database gives the same numbers and the same red-team score every time, so the video can be re-recorded", async () => {
    const [a, b] = [await demoStory(), await demoStory()];
    expect([b.ring, b.rule.rule_id, b.rule.red_team.caught]).toEqual([a.ring, a.rule.rule_id, a.rule.red_team.caught]);
  });
});
