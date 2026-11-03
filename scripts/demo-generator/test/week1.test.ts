import { describe, expect, it } from "vitest";
import { generateWeek1 } from "../src/week1.js";

describe("generateWeek1", () => {
  it("produces exactly 412 payees with unique account and item ids", () => {
    const { run } = generateWeek1(42);
    expect(run.items.length).toBe(412);
    expect(new Set(run.items.map((it) => it.context.account_id)).size).toBe(412);
    expect(new Set(run.items.map((it) => it.sender_item_id)).size).toBe(412);
    expect(run.sender_batch_header.sender_batch_id).toBe("run_2026w45");
  });

  it("is fully reproducible from the same seed", () => {
    const a = generateWeek1(42);
    const b = generateWeek1(42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces a different (but still 412-item) run for a different seed", () => {
    const a = generateWeek1(42);
    const b = generateWeek1(7);
    expect(b.run.items.length).toBe(412);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("labels exactly 23 accounts as the ring, on 3 devices, within a 15-minute signup window", () => {
    const { run, truth } = generateWeek1(42);
    const ringTruth = truth.filter((t) => t.group === "ring");
    expect(ringTruth.length).toBe(23);

    const ringItems = run.items.filter((it) => ringTruth.some((t) => t.account_id === it.context.account_id));
    const devices = new Set(ringItems.map((it) => it.context.device_hash));
    expect(devices.size).toBe(3);

    const times = ringItems.map((it) => new Date(it.context.signup_at).getTime()).sort((a, b) => a - b);
    const spreadMinutes = ((times.at(-1) ?? 0) - (times[0] ?? 0)) / 60_000;
    expect(spreadMinutes).toBeLessThan(15);

    for (const it of ringItems) {
      expect(it.context.onboarding_seconds).toBeLessThanOrEqual(120);
      expect(it.context.activity_after_onboarding).toBe(0);
    }
  });

  it("labels exactly 2 roommates sharing one device", () => {
    const { run, truth } = generateWeek1(42);
    const roommateTruth = truth.filter((t) => t.group === "roommates");
    expect(roommateTruth.length).toBe(2);
    const items = run.items.filter((it) => roommateTruth.some((t) => t.account_id === it.context.account_id));
    expect(new Set(items.map((it) => it.context.device_hash)).size).toBe(1);
  });

  it("labels exactly 5 coworkers who share no device, IP or payout address", () => {
    const { run, truth } = generateWeek1(42);
    const coworkerTruth = truth.filter((t) => t.group === "coworkers");
    expect(coworkerTruth.length).toBe(5);
    const items = run.items.filter((it) => coworkerTruth.some((t) => t.account_id === it.context.account_id));
    expect(new Set(items.map((it) => it.context.device_hash)).size).toBe(5);
    expect(new Set(items.map((it) => it.context.ip_prefix)).size).toBe(5);
    expect(new Set(items.map((it) => it.receiver)).size).toBe(5);
  });

  it("labels the remaining 382 as honest, with no accidental collisions on device, address or ring devices", () => {
    const { run, truth } = generateWeek1(42);
    const honestTruth = truth.filter((t) => t.group === "honest");
    expect(honestTruth.length).toBe(382);
    const honestItems = run.items.filter((it) => honestTruth.some((t) => t.account_id === it.context.account_id));
    expect(new Set(honestItems.map((it) => it.context.device_hash)).size).toBe(382);
    expect(new Set(honestItems.map((it) => it.receiver)).size).toBe(382);
  });
});
