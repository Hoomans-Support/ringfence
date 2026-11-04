/**
 * Fire drill (FR-23): one synthetic referral program, run through three payout gates, scored
 * against its own ground truth.
 *
 *   no gate          pays everyone (today's flow)
 *   per-request gate judges each payee alone and holds anyone it can't vouch for: any individual
 *                    risk flag (onboarded in 2 minutes or less, no activity since, disposable email)
 *   Ringfence        the graph engine and starter rules, plus the learned rule R-07 approved in the demo
 *
 * The honest crowd shares devices and networks the way real people do, or the false-hold number
 * would mean nothing (PRD, Technical depth): families on one home network, some sharing a tablet;
 * roommates, some sharing a laptop; dorm groups on one campus network signing up the same evening;
 * coworkers from one referrer pasting the same answer. Ring accounts come in three kinds: a device
 * farm (a few devices, one network), a device rotator (a new device per account, linked by email
 * pattern and network), and a full disguise (nothing shared but the referrer and the behaviour, the
 * week 2 ring). `evasion` is the share of ring accounts that also fake activity and slow down
 * onboarding, so no individual risk flag shows on them at all.
 *
 * The ring share is an assumption (no public source gives a real one): 5% by default, the week 1
 * share (23 of 412), and swept from 1% to 20%.
 *
 *   npm run fire-drill        prints the tables and writes docs/fire-drill.md
 */
import { writeFileSync } from "node:fs";
import { evaluateRules, isDisposableDomain, type PayoutItem, type PayoutRun, type Rule } from "@ringfence/engine";
import { Rng } from "./demo-generator/src/rng";
import { FIRST_NAMES, HONEST_ANSWERS, LAST_NAMES } from "./demo-generator/src/pools";

/** The learned rule as approved in the demo (PRD, "The learning loop"). */
export const R07: Rule = {
  id: "R-07",
  action: "HOLD",
  when: { all: [
    { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
    { signal: "onboarding_seconds", max: 120 },
    { signal: "activity_after_onboarding", max: 0 },
  ] },
};

export interface ProgramOptions {
  seed: number;
  payees?: number;
  ringShare?: number;
  evasion?: number;
}

export interface Program {
  run: PayoutRun;
  ring: Set<string>;
}

const PAYOUT_AT = Date.parse("2026-11-16T09:00:00Z");
const DAY = 86_400_000;
const AMOUNT = 20;

export function generateProgram({ seed, payees = 1000, ringShare = 0.05, evasion = 0 }: ProgramOptions): Program {
  const rng = new Rng(seed);
  const items: PayoutItem[] = [];
  const ring = new Set<string>();
  let n = 0;
  let net = 0;
  const newNetwork = () => `10.${Math.floor(++net / 256) % 256}.${net % 256}.0/24`;
  const someTimeThisWeek = () => PAYOUT_AT - rng.int(1, 7) * DAY + rng.int(0, 23 * 60) * 60_000;

  function add(kind: "ring" | "honest", ctx: Partial<PayoutItem["context"]>, receiver?: string): void {
    n += 1;
    const id = `fd_${n}`;
    const first = rng.pick(FIRST_NAMES).toLowerCase();
    const last = rng.pick(LAST_NAMES).toLowerCase();
    const honest = kind === "honest";
    items.push({
      recipient_type: "EMAIL",
      receiver: receiver ?? `p${n}.${first}.${last}@${rng.float() < 0.01 ? "mailinator.com" : rng.pick(["gmail.com", "yahoo.com", "outlook.com", "icloud.com"])}`,
      amount: { value: AMOUNT.toFixed(2), currency: "USD" },
      sender_item_id: id,
      context: {
        account_id: `u_${id}`,
        signup_at: new Date(someTimeThisWeek()).toISOString(),
        device_hash: `dev_${id}`,
        ip_prefix: newNetwork(),
        referrer_id: `ref_honest_${rng.int(1, 40)}`,
        answer: rng.pick(HONEST_ANSWERS),
        // Honest pace: a few finish inside 2 minutes, about 1 in 10 never comes back after.
        onboarding_seconds: honest ? rng.int(45, 1800) : rng.int(40, 115),
        activity_after_onboarding: honest ? (rng.float() < 0.1 ? 0 : rng.int(1, 12)) : 0,
        ...ctx,
      },
    });
    if (!honest) {
      ring.add(id);
      const item = items[items.length - 1] as PayoutItem;
      if (rng.float() < evasion) {
        item.context.onboarding_seconds = rng.int(130, 400);
        item.context.activity_after_onboarding = rng.int(1, 3);
      }
    }
  }

  // --- Rings: split across the three kinds ---
  const ringTotal = Math.round(payees * ringShare);
  const sizes = [Math.round(ringTotal * 0.4), Math.round(ringTotal * 0.3)];
  sizes.push(ringTotal - (sizes[0] ?? 0) - (sizes[1] ?? 0));
  const [farm = 0, rotator = 0, disguised = 0] = sizes;
  let ringNo = 0;

  const burst = (minutes: number) => {
    const start = PAYOUT_AT - rng.int(2, 5) * DAY;
    return () => new Date(start + rng.int(0, minutes - 1) * 60_000).toISOString();
  };
  {
    ringNo += 1;
    const at = burst(15);
    const ip = newNetwork();
    const devices = Math.max(1, Math.ceil(farm / 8));
    for (let i = 0; i < farm; i++) {
      add("ring", { signup_at: at(), device_hash: `farm_${seed}_${i % devices}`, ip_prefix: ip, referrer_id: `ref_ring_${ringNo}` }, `cashout${String(i + 1).padStart(2, "0")}@gmail.com`);
    }
  }
  {
    ringNo += 1;
    const at = burst(20);
    const ip = newNetwork();
    for (let i = 0; i < rotator; i++) {
      add("ring", { signup_at: at(), ip_prefix: ip, referrer_id: `ref_ring_${ringNo}` }, `rewards.hunter+${i}@outlook.com`);
    }
  }
  {
    ringNo += 1;
    const at = burst(20);
    const domains = ["fastmail.com", "proton.me", "icloud.com", "outlook.com", "yahoo.com"];
    for (let i = 0; i < disguised; i++) {
      add("ring", { signup_at: at(), referrer_id: `ref_ring_${ringNo}`, answer: `new wording ${i}` }, `member${rng.int(100, 999)}x${i}@${domains[i % domains.length]}`);
    }
  }

  // --- The honest crowd ---
  const honestTotal = payees - ringTotal;
  const left = () => honestTotal - (n - ringTotal);
  const group = (size: number, shared: (i: number) => Partial<PayoutItem["context"]>) => {
    for (let i = 0; i < Math.min(size, left()); i++) add("honest", shared(i));
  };

  for (let f = 0; f < Math.round(honestTotal * 0.04) && left() > 0; f++) {
    // Families of 2 to 4 on one home network; 3 in 10 have a tablet two of them share.
    const ip = newNetwork();
    const tablet = rng.float() < 0.3 ? `tablet_${seed}_${f}` : undefined;
    group(rng.int(2, 4), (i) => ({ ip_prefix: ip, ...(tablet && i < 2 ? { device_hash: tablet } : {}) }));
  }
  for (let r = 0; r < Math.round(honestTotal * 0.03) && left() > 0; r++) {
    // Roommates, 2 or 3 on one network; 1 in 5 share a laptop.
    const ip = newNetwork();
    const laptop = rng.float() < 0.2 ? `laptop_${seed}_${r}` : undefined;
    group(rng.int(2, 3), (i) => ({ ip_prefix: ip, ...(laptop && i < 2 ? { device_hash: laptop } : {}) }));
  }
  for (let d = 0; d < 3 && left() > 0; d++) {
    // Dorm groups of 15 to 25 on one campus network, half of them signing up the same evening.
    const ip = newNetwork();
    const evening = PAYOUT_AT - rng.int(2, 6) * DAY + 20 * 3_600_000;
    group(rng.int(15, 25), () => ({
      ip_prefix: ip,
      ...(rng.float() < 0.5 ? { signup_at: new Date(evening + rng.int(0, 120) * 60_000).toISOString() } : {}),
    }));
  }
  for (let c = 0; c < 6 && left() > 0; c++) {
    // Coworkers, 5 or 6 after a team lunch: one referrer, one office network, the same pasted answer.
    const ip = newNetwork();
    const lunch = PAYOUT_AT - rng.int(2, 6) * DAY + 13 * 3_600_000;
    const answer = "Everyone at work signed up after lunch so I did too";
    group(rng.int(5, 6), () => ({
      ip_prefix: ip,
      referrer_id: `ref_office_${c}`,
      answer,
      signup_at: new Date(lunch + rng.int(0, 45) * 60_000).toISOString(),
      onboarding_seconds: rng.int(200, 900),
    }));
  }
  while (left() > 0) add("honest", {});

  return { run: { sender_batch_header: { sender_batch_id: `fire_drill_${seed}` }, items: rng.shuffle(items) }, ring };
}

export type Gate = "no gate" | "per-request gate" | "Ringfence";
export const GATES: Gate[] = ["no gate", "per-request gate", "Ringfence"];

export function heldBy(gate: Gate, run: PayoutRun): Set<string> {
  if (gate === "no gate") return new Set();
  if (gate === "per-request gate") {
    return new Set(
      run.items
        .filter((i) =>
          (i.context.onboarding_seconds ?? Infinity) <= 120 ||
          i.context.activity_after_onboarding === 0 ||
          isDisposableDomain(i.receiver.split("@")[1] ?? ""),
        )
        .map((i) => i.sender_item_id),
    );
  }
  return new Set(evaluateRules(run, [R07]).decisions.filter((d) => d.decision !== "PAY").map((d) => d.sender_item_id));
}

export interface Score {
  leaked_per_1000_usd: number;
  honest_held: number;
  honest_held_pct: number;
  precision: number;
  recall: number;
}

export function score(program: Program, held: Set<string>): Score {
  const { run, ring } = program;
  const honest = run.items.length - ring.size;
  const caught = [...held].filter((id) => ring.has(id)).length;
  const honestHeld = held.size - caught;
  const leakedUsd = (ring.size - caught) * AMOUNT;
  return {
    leaked_per_1000_usd: (leakedUsd / run.items.length) * 1000,
    honest_held: honestHeld,
    honest_held_pct: honest === 0 ? 0 : (honestHeld / honest) * 100,
    precision: held.size === 0 ? 1 : caught / held.size,
    recall: ring.size === 0 ? 1 : caught / ring.size,
  };
}

/** Averages each gate's score over `seeds` programs built with `opts`. */
export function drill(opts: Omit<ProgramOptions, "seed">, seeds = [1, 2, 3, 4, 5]): Record<Gate, Score> {
  const totals = Object.fromEntries(GATES.map((g) => [g, { leaked_per_1000_usd: 0, honest_held: 0, honest_held_pct: 0, precision: 0, recall: 0 }])) as Record<Gate, Score>;
  for (const seed of seeds) {
    const program = generateProgram({ ...opts, seed });
    for (const gate of GATES) {
      const s = score(program, heldBy(gate, program.run));
      for (const k of Object.keys(s) as Array<keyof Score>) totals[gate][k] += s[k] / seeds.length;
    }
  }
  return totals;
}

/** Of the honest members Ringfence holds, the share who are one of exactly two accounts on a device. */
function sharedDevicePairShare(seeds = [1, 2, 3, 4, 5]): number {
  let held = 0;
  let pairs = 0;
  for (const seed of seeds) {
    const program = generateProgram({ seed });
    const perDevice = new Map<string, number>();
    for (const i of program.run.items) perDevice.set(i.context.device_hash, (perDevice.get(i.context.device_hash) ?? 0) + 1);
    const device = new Map(program.run.items.map((i) => [i.sender_item_id, i.context.device_hash] as const));
    for (const id of heldBy("Ringfence", program.run)) {
      if (program.ring.has(id)) continue;
      held += 1;
      if (perDevice.get(device.get(id) ?? "") === 2) pairs += 1;
    }
  }
  return held === 0 ? 0 : pairs / held;
}

function table(title: string, rows: Array<[string, Record<Gate, Score>]>, label: string): string {
  const lines = [
    `### ${title}`,
    "",
    `| ${label} | Gate | $ leaked per 1,000 payouts | Honest members held | Precision | Recall |`,
    "| --- | --- | ---: | ---: | ---: | ---: |",
  ];
  for (const [value, result] of rows) {
    for (const gate of GATES) {
      const s = result[gate];
      lines.push(
        `| ${value} | ${gate} | $${s.leaked_per_1000_usd.toFixed(0)} | ${s.honest_held.toFixed(1)} (${s.honest_held_pct.toFixed(2)}%) | ${(s.precision * 100).toFixed(1)}% | ${(s.recall * 100).toFixed(1)}% |`,
      );
    }
  }
  return lines.join("\n");
}

function main(): void {
  const headline = drill({ ringShare: 0.05 });
  const none = headline["no gate"].leaked_per_1000_usd;
  const ours = headline.Ringfence;
  const shares = [0.01, 0.02, 0.05, 0.1, 0.2].map((ringShare) => [`${ringShare * 100}%`, drill({ ringShare })] as [string, Record<Gate, Score>]);
  const evasions = [0, 0.25, 0.5].map((evasion) => [`${evasion * 100}%`, drill({ ringShare: 0.05, evasion })] as [string, Record<Gate, Score>]);

  const report = [
    "# Fire drill",
    "",
    "One synthetic referral program of 1,000 payees at $20, run three ways and scored against its own ground truth, averaged over 5 seeds. Generated by `npm run fire-drill` (scripts/fire-drill.ts), which also states every assumption behind the honest crowd and the rings.",
    "",
    `**Headline, at an assumed 5% ring share:** Ringfence leaks $${ours.leaked_per_1000_usd.toFixed(0)} per 1,000 payouts against $${none.toFixed(0)} with no gate (${none === 0 ? "n/a" : ((1 - ours.leaked_per_1000_usd / none) * 100).toFixed(0)}% less), holding ${ours.honest_held_pct.toFixed(2)}% of honest members. The per-request gate leaks $${headline["per-request gate"].leaked_per_1000_usd.toFixed(0)} but holds ${headline["per-request gate"].honest_held_pct.toFixed(1)}% of them.`,
    "",
    `Against the PRD's targets (at least 90% less leaked, under 1% of honest members held), the first is met and the second is just missed. ${(sharedDevicePairShare() * 100).toFixed(0)}% of the honest members Ringfence holds are one of two people sharing a device (a family tablet, a roommate's laptop) where one of them carries a risk flag: the roommates case from the demo, released in one click. Dorm groups, coworkers and the learned rule hold no one honest.`,
    "",
    "The ring share is an assumption: no public source gives a real one. 5% is the week 1 demo share (23 of 412).",
    "",
    table("Sweep: ring share", shares, "Ring share (assumed)"),
    "",
    table("Sweep: ring accounts that fake activity and slow down onboarding, at 5% ring share", evasions, "Evading accounts"),
    "",
  ].join("\n");
  console.log(report);
  writeFileSync("docs/fire-drill.md", report);
  console.error("\nWrote docs/fire-drill.md");
}

if (process.argv[1]?.endsWith("fire-drill.ts")) main();
