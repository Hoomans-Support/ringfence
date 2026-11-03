/**
 * Week 1 demo data (FR-12): the budgeting app's first Monday run through
 * Ringfence. 412 payees — a 23-account ring on 3 devices, a roommate pair
 * sharing a laptop, 5 coworkers who joined after a team lunch, and 382
 * other honest members — all deterministic from one seed, per
 * final-prd.docx's demo data table and user journey (Week 1: the first run).
 */
import type { PayoutItem } from "@ringfence/engine";
import { COWORKER_ANSWERS, FIRST_NAMES, HONEST_ANSWERS, HONEST_EMAIL_DOMAINS, LAST_NAMES, RING_ANSWER_OUTLIERS, RING_ANSWER_VARIANTS } from "./pools";
import { Rng } from "./rng";
import type { GroundTruthLabel, WeekFixture } from "./types";

export const WEEK1_RUN_ID = "run_2026w45";
const WEEK1_PAYOUT_AT = Date.parse("2026-11-02T09:00:00Z"); // Monday 9:00

const RING_SIZE = 23;
const RING_DEVICES = ["d_ring_falcon", "d_ring_heron", "d_ring_osprey"];
const RING_IP_PREFIX = "10.200.14.0/24"; // the ring's one shared network, despite rotating 3 devices
const RING_REFERRER = "u_ring_referrer";
const RING_WINDOW_START = WEEK1_PAYOUT_AT - 3 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000; // Friday afternoon
const RING_WINDOW_MINUTES = 15;

const ROOMMATES_DEVICE = "d_roommates_laptop";

const HONEST_COUNT = 382;
const TOTAL_PAYEES = RING_SIZE + 2 + 5 + HONEST_COUNT; // 412

function amount(): PayoutItem["amount"] {
  return { value: "20.00", currency: "USD" };
}

function isoMinutesAfter(baseMs: number, minutes: number): string {
  return new Date(baseMs + minutes * 60_000).toISOString();
}

function isoDaysBefore(baseMs: number, days: number, hourOffset: number): string {
  return new Date(baseMs - days * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000).toISOString();
}

export function generateWeek1(seed: number): WeekFixture {
  const rng = new Rng(seed);
  const items: PayoutItem[] = [];
  const truth: GroundTruthLabel[] = [];
  let n = 0;
  const nextId = () => {
    n += 1;
    return n;
  };

  // --- The 23-account ring, split across 3 devices, one shared network ---
  for (let i = 0; i < RING_SIZE; i++) {
    const id = nextId();
    const accountId = `u_${id}`;
    const senderItemId = `ref_${id}`;
    const device = RING_DEVICES[i % RING_DEVICES.length] ?? RING_DEVICES[0];
    const minuteOffset = rng.int(0, RING_WINDOW_MINUTES - 1);
    const answer = i < RING_ANSWER_VARIANTS.length ? RING_ANSWER_VARIANTS[i] : rng.pick(RING_ANSWER_OUTLIERS);

    items.push({
      recipient_type: "EMAIL",
      receiver: `budgetfriend${String(i + 1).padStart(2, "0")}@gmail.com`,
      amount: amount(),
      sender_item_id: senderItemId,
      context: {
        account_id: accountId,
        signup_at: isoMinutesAfter(RING_WINDOW_START, minuteOffset),
        device_hash: device as string,
        ip_prefix: RING_IP_PREFIX,
        referrer_id: RING_REFERRER,
        answer,
        onboarding_seconds: rng.int(40, 115),
        activity_after_onboarding: 0,
      },
    });
    truth.push({ sender_item_id: senderItemId, account_id: accountId, group: "ring", ring_label: "R-12" });
  }

  // --- The roommates: 2 accounts, one shared laptop ---
  const roommates = [
    { first: "Sam", last: "Rivera", domain: "gmail.com" },
    { first: "Alex", last: "Kim", domain: "yahoo.com" },
  ];
  for (let i = 0; i < roommates.length; i++) {
    const id = nextId();
    const accountId = `u_${id}`;
    const senderItemId = `ref_${id}`;
    const person = roommates[i];
    if (!person) continue;
    items.push({
      recipient_type: "EMAIL",
      receiver: `${person.first.toLowerCase()}.${person.last.toLowerCase()}@${person.domain}`,
      amount: amount(),
      sender_item_id: senderItemId,
      context: {
        account_id: accountId,
        signup_at: isoDaysBefore(WEEK1_PAYOUT_AT, 2, rng.int(-2, 2)),
        device_hash: ROOMMATES_DEVICE,
        ip_prefix: `10.60.${i}.0/24`,
        referrer_id: "u_honest_referrer_1",
        answer: rng.pick(HONEST_ANSWERS),
        onboarding_seconds: rng.int(40, 75), // fast — under 2 minutes
        activity_after_onboarding: rng.int(1, 4), // active, not quiet
      },
    });
    truth.push({ sender_item_id: senderItemId, account_id: accountId, group: "roommates" });
  }

  // --- The coworkers: 5 accounts, same pasted answer, no shared graph signal ---
  for (let i = 0; i < 5; i++) {
    const id = nextId();
    const accountId = `u_${id}`;
    const senderItemId = `ref_${id}`;
    const first = FIRST_NAMES[(10 + i) % FIRST_NAMES.length] ?? "Jordan";
    const last = LAST_NAMES[(20 + i) % LAST_NAMES.length] ?? "Lee";
    items.push({
      recipient_type: "EMAIL",
      receiver: `${first.toLowerCase()}.${last.toLowerCase()}@outlook.com`,
      amount: amount(),
      sender_item_id: senderItemId,
      context: {
        account_id: accountId,
        signup_at: isoDaysBefore(WEEK1_PAYOUT_AT, 3, rng.int(0, 5)),
        device_hash: `d_coworker_${i}`,
        ip_prefix: `10.70.${i}.0/24`,
        referrer_id: "u_honest_referrer_2",
        answer: i < COWORKER_ANSWERS.length ? COWORKER_ANSWERS[i] : rng.pick(COWORKER_ANSWERS),
        onboarding_seconds: rng.int(240, 900), // normal pace, not a speed flag
        activity_after_onboarding: rng.int(2, 8), // active afterward
      },
    });
    truth.push({ sender_item_id: senderItemId, account_id: accountId, group: "coworkers" });
  }

  // --- The rest: honest members, no shared signals, unique identities ---
  const namePairs: Array<{ first: string; last: string }> = [];
  for (const first of FIRST_NAMES) {
    for (const last of LAST_NAMES) {
      namePairs.push({ first, last });
    }
  }
  const shuffledNames = rng.shuffle(namePairs);

  for (let i = 0; i < HONEST_COUNT; i++) {
    const id = nextId();
    const accountId = `u_${id}`;
    const senderItemId = `ref_${id}`;
    const name = shuffledNames[i % shuffledNames.length];
    if (!name) continue;
    const domain = rng.pick(HONEST_EMAIL_DOMAINS);
    const uniqueSuffix = Math.floor(i / shuffledNames.length); // only if we ever wrap, which we don't at 382 < 1600
    const localPart = uniqueSuffix > 0 ? `${name.first.toLowerCase()}.${name.last.toLowerCase()}.${uniqueSuffix}` : `${name.first.toLowerCase()}.${name.last.toLowerCase()}`;

    items.push({
      recipient_type: "EMAIL",
      receiver: `${localPart}@${domain}`,
      amount: amount(),
      sender_item_id: senderItemId,
      context: {
        account_id: accountId,
        signup_at: isoDaysBefore(WEEK1_PAYOUT_AT, rng.int(0, 6), rng.int(0, 23)),
        device_hash: `d_honest_${id}`,
        ip_prefix: `10.${100 + Math.floor(id / 256)}.${id % 256}.0/24`,
        referrer_id: `u_honest_referrer_${rng.int(1, 12)}`,
        answer: rng.pick(HONEST_ANSWERS),
        onboarding_seconds: rng.int(60, 1800),
        activity_after_onboarding: rng.int(0, 10),
      },
    });
    truth.push({ sender_item_id: senderItemId, account_id: accountId, group: "honest" });
  }

  if (items.length !== TOTAL_PAYEES) {
    throw new Error(`generateWeek1 produced ${items.length} items, expected ${TOTAL_PAYEES}`);
  }

  return {
    run: {
      sender_batch_header: { sender_batch_id: WEEK1_RUN_ID, email_subject: "Your $20 reward" },
      items,
    },
    truth,
  };
}
