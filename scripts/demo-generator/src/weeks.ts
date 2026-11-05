/**
 * Deterministic fixtures for the multi-week demo sequence (FR-20).
 * Week 2 deliberately has no shared device or IP graph edges: the learned-rule
 * hold is represented by ground truth for the mock console, which presents it
 * as fixture data for the demo narrative rather than calling the live rule
 * engine's own /v1/rules endpoints.
 */
import { scoreRun, type PayoutItem } from "@ringfence/engine";
import { closeCaughtCases, investigate, recordOpenCases, redTeamRule } from "@ringfence/agents";
import { Rng } from "./rng";
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

/**
 * Week 3 brings R-12 back with fresh identities. Its ground truth is derived from the real
 * red-team misses for R-07: some remain open after the app's actual v2 revision, while others
 * are cases that revision closes. This keeps the fixture tied to the same learning loop shown
 * by the console instead of hand-picking a flattering catch rate.
 */
export function generateWeek3(seed: number): WeekFixture {
  const base = generateWeek1(seed);
  const scored = scoreRun(base.run);
  const ringTruth = new Set(base.truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
  const ring = [...scored.rings]
    .map((candidate) => ({ candidate, overlap: candidate.member_sender_item_ids.filter((id) => ringTruth.has(id)).length }))
    .sort((a, b) => b.overlap - a.overlap)[0]?.candidate;
  if (!ring) throw new Error("generateWeek3 could not find the Week 1 R-12 ring");

  const rule = redTeamRule(investigate(ring, base.run).proposed_rule);
  const openCases = recordOpenCases([], rule);
  const revisedBase = investigate(ring, base.run, { openCases }).proposed_rule;
  const revised = revisedBase.id !== rule.id ? redTeamRule(revisedBase) : null;
  const closed = revised ? closeCaughtCases(openCases, revised) : openCases;
  const statusByAttempt = new Map(closed.map((entry) => [entry.id, entry.status]));
  const oldMisses = rule.red_team?.open_misses ?? [];
  const selected = oldMisses.filter((attempt) => !attempt.held_out);
  if (selected.length === 0) throw new Error("generateWeek3 found no non-held-out R-07 misses to replay");

  const payoutAt = Date.parse("2026-11-16T09:00:00Z");
  const items: PayoutItem[] = selected.map((attempt, index) => {
    const number = index + 1;
    const id = `w3_ref_${String(number).padStart(3, "0")}`;
    const caughtByV2 = statusByAttempt.get(attempt.id) === "closed";
    return {
      recipient_type: "EMAIL",
      receiver: `returning${String(number).padStart(3, "0")}@${["fastmail.com", "proton.me", "icloud.com", "outlook.com"][index % 4]}`,
      amount: { value: "20.00", currency: "USD" },
      sender_item_id: id,
      context: {
        account_id: `u_w3_${String(number).padStart(3, "0")}`,
        signup_at: new Date(payoutAt - 3 * DAY - 6 * 60 * 60 * 1000 + attempt.signup_spread_minutes * 60_000).toISOString(),
        device_hash: `d_w3_unique_${number}`,
        ip_prefix: `203.0.${Math.floor(number / 250)}.${number % 250}/24`,
        referrer_id: attempt.same_referrer ? "u_ring_referrer" : `u_w3_referrer_${number}`,
        answer: `Updated survey response ${number}`,
        onboarding_seconds: attempt.onboarding_seconds,
        activity_after_onboarding: attempt.activity_after_onboarding,
      },
    };
  });
  const truth: GroundTruthLabel[] = selected.map((attempt, index) => ({
    sender_item_id: `w3_ref_${String(index + 1).padStart(3, "0")}`,
    account_id: `u_w3_${String(index + 1).padStart(3, "0")}`,
    group: "ring",
    ring_label: statusByAttempt.get(attempt.id) === "closed" ? "R-12 (R-07-v2 case)" : "R-12 (still evades R-07-v2)",
  }));
  const fixture = generateWeek2(seed);
  const honestFixture = select(fixture, new Set(["honest"]));
  setRun(honestFixture, "run_2026w47", "Your $20 reward");
  honestFixture.run.items.push(...items);
  honestFixture.truth.push(...truth);
  return honestFixture;
}

/** First-sight cross-program screening dataset, with six payees reusing a device from R-12. */
export function generateSurveyApp(seed: number): WeekFixture {
  const base = generateWeek1(seed);
  const ringIds = new Set(base.truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
  const ringDevices = [...new Set(base.run.items.filter((item) => ringIds.has(item.sender_item_id)).map((item) => item.context.device_hash))];
  const sharedDevice = ringDevices[0];
  if (!sharedDevice) throw new Error("generateSurveyApp could not find an R-12 device");
  const rng = new Rng(seed ^ 0x5a17);
  const run: WeekFixture = {
    run: { sender_batch_header: { sender_batch_id: "surveyapp_first_sight", email_subject: "Survey app rewards" }, items: [] },
    truth: [],
  };
  for (let i = 1; i <= 120; i++) {
    const match = i > 114;
    const id = String(i).padStart(3, "0");
    const senderItemId = `survey_${id}`;
    const accountId = `survey_u_${id}`;
    const day = 1 + (i - 1) % 5;
    const hour = rng.int(0, 8);
    run.run.items.push({
      recipient_type: "EMAIL",
      receiver: `survey.payee${id}@example.test`,
      amount: { value: "10.00", currency: "USD" },
      sender_item_id: senderItemId,
      context: {
        account_id: accountId,
        signup_at: `2026-11-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`,
        device_hash: match ? sharedDevice : `survey_device_${id}`,
        ip_prefix: `192.0.${Math.floor(i / 250)}.${i % 250}/24`,
        referrer_id: `survey_ref_${id}`,
        onboarding_seconds: 360,
        activity_after_onboarding: 5,
      },
    });
    run.truth.push({ sender_item_id: senderItemId, account_id: accountId, group: match ? "ring_match" : "honest", ...(match ? { ring_label: "R-12" } : {}) });
  }
  return run;
}

/** Week 4 is the same survey-app first-sight event, under the main narrative's run id. */
export function generateWeek4(seed: number): WeekFixture {
  const fixture = generateSurveyApp(seed);
  fixture.run.sender_batch_header.sender_batch_id = "run_2026w48";
  const week1 = generateWeek1(seed);
  const recoveryItems = week1.truth
    .filter((label) => label.group === "ring" && label.ring_label === "R-12")
    .map((label) => label.sender_item_id);
  const amountCents = week1.run.items
    .filter((item) => recoveryItems.includes(item.sender_item_id))
    .reduce((total, item) => total + Math.round(Number(item.amount.value) * 100), 0);
  fixture.demo = {
    kind: "cross_program_recovery",
    recovery: {
      status: "fixture_cancelled_unclaimed",
      source_run_id: week1.run.sender_batch_header.sender_batch_id,
      sender_item_ids: recoveryItems,
      amount_usd: amountCents / 100,
    },
  };
  return fixture;
}
