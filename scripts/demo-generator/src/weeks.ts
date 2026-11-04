/**
 * Deterministic fixtures for the three-week demo sequence (FR-20).
 * Week 2 deliberately has no shared device or IP graph edges: the learned-rule
 * hold is represented by ground truth for the mock console until A's rule
 * evaluator supplies live decisions.
 */
import type { PayoutItem } from "@ringfence/engine";
import { generateWeek1 } from "./week1";
import type { GroundTruthLabel, WeekFixture } from "./types";

const DAY = 24 * 60 * 60 * 1000;

function select(fixture: WeekFixture, groups: Set<string>): WeekFixture {
  const labels = fixture.truth.filter((label) => groups.has(label.group));
  const ids = new Set(labels.map((label) => label.sender_item_id));
  return {
    run: {
      sender_batch_header: fixture.run.sender_batch_header,
      items: fixture.run.items.filter((item) => ids.has(item.sender_item_id)),
    },
    truth: labels,
  };
}

function addHonestPayees(fixture: WeekFixture, baseFixture: WeekFixture, count: number, prefix: string): void {
  const honest = baseFixture.truth
    .filter((label) => label.group === "honest")
    .map((label) => ({ label, item: baseFixture.run.items.find((item) => item.sender_item_id === label.sender_item_id) }))
    .filter((pair): pair is { label: GroundTruthLabel; item: PayoutItem } => pair.item !== undefined);
  const missing = count - honest.length;
  if (missing <= 0) return;

  for (let i = 0; i < missing; i++) {
    const source = honest[i % honest.length];
    if (!source) continue;
    const suffix = i + 1;
    const accountId = `${prefix}_honest_${suffix}`;
    const senderItemId = `${prefix}_ref_honest_${suffix}`;
    const [localPart, domain = "example.com"] = source.item.receiver.split("@");
    fixture.run.items.push({
      ...source.item,
      receiver: `${localPart}${prefix}${suffix}@${domain}`,
      sender_item_id: senderItemId,
      context: {
        ...source.item.context,
        account_id: accountId,
        device_hash: `${prefix}_device_${suffix}`,
        ip_prefix: `172.${20 + (suffix % 100)}.${Math.floor(suffix / 250)}.${suffix % 250}/24`,
      },
    });
    fixture.truth.push({ sender_item_id: senderItemId, account_id: accountId, group: "honest" });
  }
}

function setRun(fixture: WeekFixture, batchId: string, subject: string): void {
  fixture.run.sender_batch_header = { sender_batch_id: batchId, email_subject: subject };
}

export function generateWeek0(seed: number): WeekFixture {
  const base = generateWeek1(seed);
  const fixture = select(base, new Set(["ring", "honest"]));
  const ringIds = new Set(fixture.truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
  fixture.run.items = fixture.run.items.filter((item) => !ringIds.has(item.sender_item_id));
  fixture.truth = fixture.truth.filter((label) => !ringIds.has(label.sender_item_id));
  const baseRing = base.truth.filter((label) => label.group === "ring").slice(0, 9);
  const ringItemIds = new Set(baseRing.map((label) => label.sender_item_id));
  fixture.run.items.unshift(...base.run.items.filter((item) => ringItemIds.has(item.sender_item_id)));
  fixture.truth.unshift(...baseRing);
  addHonestPayees(fixture, base, 389, "w0");

  const payoutAt = Date.parse("2026-10-26T09:00:00Z");
  for (const item of fixture.run.items) {
    const original = Date.parse(item.context.signup_at);
    const relativeToWeek1 = Date.parse("2026-11-02T09:00:00Z") - original;
    item.context.signup_at = new Date(payoutAt - relativeToWeek1).toISOString();
  }
  setRun(fixture, "run_2026w44", "Your $20 reward");
  return fixture;
}

export function generateWeek2(seed: number): WeekFixture {
  const base = generateWeek1(seed);
  const fixture = select(base, new Set(["honest"]));
  addHonestPayees(fixture, base, 419, "w2");

  const ringLabels = base.truth.filter((label) => label.group === "ring").slice(0, 18);
  const ringItems = base.run.items.filter((item) => ringLabels.some((label) => label.sender_item_id === item.sender_item_id));
  const payoutAt = Date.parse("2026-11-09T09:00:00Z");
  const newDomains = ["fastmail.com", "proton.me", "icloud.com", "outlook.com", "yahoo.com"];
  const disguised = ringItems.map((source, index): PayoutItem => {
    const number = index + 1;
    const signupOffsetMinutes = (number * 7) % 20;
    return {
      ...source,
      receiver: `member${String(number).padStart(2, "0")}@${newDomains[index % newDomains.length]}`,
      sender_item_id: `w2_ref_${number}`,
      context: {
        ...source.context,
        account_id: `u_w2_${String(number).padStart(2, "0")}`,
        signup_at: new Date(payoutAt - 3 * DAY - 6 * 60 * 60 * 1000 + signupOffsetMinutes * 60_000).toISOString(),
        device_hash: `d_w2_unique_${number}`,
        ip_prefix: `198.51.${Math.floor(number / 250)}.${number % 250}/24`,
        referrer_id: "u_ring_referrer",
        answer: `new wording ${number}`,
        onboarding_seconds: 45 + ((number * 13) % 70),
        activity_after_onboarding: 0,
      },
    };
  });
  fixture.run.items.push(...disguised);
  fixture.truth.push(...disguised.map((item): GroundTruthLabel => ({
    sender_item_id: item.sender_item_id,
    account_id: item.context.account_id,
    group: "ring",
    ring_label: "R-07 (learned)",
  })));

  // Only the 18 disguised ring items get their deliberately-chosen near-payout dates above;
  // everything else (base honest items and the synthetic w2_ref_honest_* ones, which share the
  // "w2_ref_" string prefix with the disguised items' own "w2_ref_N" ids) must still be remapped
  // onto Week 2's timeline below. Track disguised ids by identity, not by prefix, so the honest
  // payees don't get skipped too and keep stale Week-1-era signup dates.
  const disguisedIds = new Set(disguised.map((item) => item.sender_item_id));
  for (const item of fixture.run.items) {
    if (disguisedIds.has(item.sender_item_id)) continue;
    const relativeToWeek1 = Date.parse("2026-11-02T09:00:00Z") - Date.parse(item.context.signup_at);
    item.context.signup_at = new Date(payoutAt - relativeToWeek1).toISOString();
  }
  setRun(fixture, "run_2026w46", "Your $20 reward");
  return fixture;
}
