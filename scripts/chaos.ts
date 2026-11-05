/**
 * Chaos run (FR-15): the demo's payout weeks, with the executor killed at 5 crash points, then
 * proof that every payee was paid exactly once and every cancel landed once.
 *
 * Each step runs in a child process against real Postgres and the real PayPal client. The child is
 * first started with RINGFENCE_CRASH_AT set, so it SIGKILLs itself at that point (apps/api's
 * chaos.hook), then started again without it — what a process manager would do. PayPal is the mock
 * server, running here in the parent, so it outlives every kill and its ledger is the ground truth.
 *
 *   crash point    where the process dies
 *   mid_poll       the poller, after applying the first item of a batch
 *   after_commit   a run's decisions and outbox event are committed; nothing sent yet
 *   after_claim    the executor claimed the outbox event; PayPal not called yet
 *   after_cancel   PayPal accepted a cancel; not recorded yet
 *   after_paypal   PayPal accepted a batch; its id not saved yet
 *
 *   npm run chaos     needs a throwaway local Postgres database whose name ends in _chaos, e.g.
 *                     docker run -d --name ringfence-pg -e POSTGRES_PASSWORD=pg -p 55432:5432 postgres:17-alpine
 *                     docker exec ringfence-pg psql -U postgres -c "CREATE ROLE ringfence LOGIN PASSWORD 'ringfence'"
 *                     docker exec ringfence-pg createdb -U postgres -O ringfence ringfence_chaos
 *                     (or set CHAOS_DATABASE_URL). Writes what it printed to docs/chaos-run.txt.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRealClient, MockPayPal, startMockServer, type PayoutBatchRequest } from "@ringfence/paypal";
import { connect, ensureProgram, migrate, withProgram, type Db } from "../apps/api/src/db";
import { drainOutbox } from "../apps/api/src/executor";
import { confirmRing, releaseHolds } from "../apps/api/src/holds";
import { approveRule, proposeRule } from "../apps/api/src/learning";
import { importPastRun, submitRun } from "../apps/api/src/runs";
import { handleWebhook, pollBatches, reconcile } from "../apps/api/src/sync";
import { R07 } from "./fire-drill";

const DATABASE_URL = process.env.CHAOS_DATABASE_URL ?? "postgres://ringfence:ringfence@localhost:55432/ringfence_chaos";
const PROGRAM = "budgetapp";
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const UNCLAIMED_RING = /^budgetfriend0[1-4]@/; // week 0: 4 of the ring's 9 early payouts were never claimed

// --- Child: one step of the week, as its own process ---

const STEPS: Record<string, (db: Db, paypal: ReturnType<typeof createRealClient>) => Promise<string>> = {
  async "import-week0"(db, paypal) {
    const week0 = fixture("week0");
    const direct: PayoutBatchRequest = { sender_batch_header: week0.sender_batch_header, items: week0.items.map(({ context: _c, ...item }: { context: unknown }) => item) };
    const { payout_batch_id } = await paypal.createBatch(direct, week0.sender_batch_header.sender_batch_id);
    if (!payout_batch_id) throw new Error("week 0's batch already exists at PayPal: start from a fresh mock");
    await importPastRun(db, PROGRAM, week0, payout_batch_id);
    return `week 0 paid straight through PayPal before Ringfence (${week0.items.length} payees), imported`;
  },
  async poll(db, paypal) {
    return `${await pollBatches(db, paypal)} item statuses applied`;
  },
  async "submit-week1"(db, paypal) {
    const { created } = await submitRun(db, PROGRAM, fixture("week1"));
    return `week 1 run ${created ? "recorded" : "already recorded"}; ${await drainOutbox(db, paypal)} outbox event(s) sent`;
  },
  async "release-roommates"(db, paypal) {
    const release = await releaseHolds(db, PROGRAM, { run_id: "run_2026w45", hold_group_id: "P-01", released_by: "rina@budgetapp.test" });
    return `${release.released.length} roommates in ${release.sender_batch_id}; ${await drainOutbox(db, paypal)} outbox event(s) sent`;
  },
  async "confirm-ring"(db, paypal) {
    const confirmed = await confirmRing(db, PROGRAM, "R-01", { run_id: "run_2026w45", confirmed_by: "rina@budgetapp.test" });
    return `ring R-01: ${confirmed.blocked} newly blocked, ${confirmed.cancels_queued} cancels queued; ${await drainOutbox(db, paypal)} outbox event(s) done`;
  },
  async "learn-rule"(db) {
    const proposed = await proposeRule(db, PROGRAM, { rule: R07, learned_from: { ring_id: "R-01", run_id: "run_2026w45" } });
    await approveRule(db, PROGRAM, proposed.rule_id, "rina@budgetapp.test", true);
    return `${proposed.rule_id} v${proposed.version} approved, learned from ring R-01 (backtest ${proposed.backtest.caught} caught, red team ${proposed.red_team.caught}/200)`;
  },
  async "submit-week2"(db, paypal) {
    const { created } = await submitRun(db, PROGRAM, fixture("week2"));
    return `week 2 run ${created ? "recorded" : "already recorded"}; ${await drainOutbox(db, paypal)} outbox event(s) sent`;
  },
};

async function child(step: string): Promise<void> {
  const db = await connect(DATABASE_URL);
  const paypal = createRealClient({ baseUrl: process.env.PAYPAL_BASE_URL ?? "", clientId: "chaos", clientSecret: "chaos", webhookId: "chaos", minIntervalMs: 0 });
  const run = STEPS[step];
  if (!run) throw new Error(`no step ${step}`);
  console.log(await run(db, paypal));
  await db.close();
}

// --- Parent: the week, the kills, and the audit ---

const out: string[] = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};

function runStep(step: string, env: Record<string, string>, crashAt?: string): Promise<{ signal: NodeJS.Signals | null; code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), "--step", step], {
      env: { ...process.env, ...env, ...(crashAt ? { RINGFENCE_CRASH_AT: crashAt } : {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    proc.stdout.on("data", (c: Buffer) => (stdout += c.toString()));
    proc.stderr.on("data", () => undefined);
    proc.on("exit", (code, signal) => resolve({ code, signal, stdout: stdout.trim() }));
  });
}

async function parent(): Promise<void> {
  const url = new URL(DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_chaos")) {
    throw new Error(`refusing to wipe ${url.hostname}${url.pathname}: the chaos run needs a local database whose name ends in _chaos`);
  }
  const db = await connect(DATABASE_URL);
  await db.exec("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await migrate(db);
  await ensureProgram(db, PROGRAM, "Budgeting app", "chaos-key");

  // The sandbox as observed: duplicates refused without naming the original, batches processed on
  // their own whether or not anyone polls them.
  const mock = new MockPayPal({ isUnclaimed: (r) => UNCLAIMED_RING.test(r), settleAfterMs: 100 });
  const server = await startMockServer(mock);
  try {
    process.exitCode = (await week(db, mock, server.url, url)) ? 0 : 1;
  } finally {
    await server.close();
    await db.close();
  }
}

async function week(db: Db, mock: MockPayPal, paypalUrl: string, url: URL): Promise<boolean> {
  const server = { url: paypalUrl };
  const env = { CHAOS_DATABASE_URL: DATABASE_URL, PAYPAL_BASE_URL: server.url, RINGFENCE_LEASE_SECONDS: "1" };

  say(`Ringfence chaos run, ${new Date().toISOString()}`);
  say(`Postgres ${url.host}${url.pathname} · PayPal mock server at ${server.url} (outlives every kill)`);
  say();

  const plan: Array<[string, string | undefined]> = [
    ["import-week0", undefined],
    ["poll", "mid_poll"],
    ["submit-week1", "after_commit"],
    ["release-roommates", "after_claim"],
    ["poll", undefined],
    ["confirm-ring", "after_cancel"],
    ["learn-rule", undefined],
    ["submit-week2", "after_paypal"],
    ["webhooks", undefined],
    ["poll", undefined],
  ];
  let kills = 0;
  for (const [i, [step, crashAt]] of plan.entries()) {
    const label = `${String(i + 1).padStart(2)}  ${step.padEnd(18)}`;
    if (step === "webhooks") {
      // PayPal's webhooks for the whole week, arriving late (as the PRD warns sandbox webhooks do)
      // and all at once, through the API's own verified handler. The week 2 batch's retry was refused
      // as a duplicate PayPal didn't name; its first webhook is what names it.
      const paypal = createRealClient({ baseUrl: server.url, clientId: "chaos", clientSecret: "chaos", webhookId: "chaos", minIntervalMs: 0 });
      const unnamed = (await db.query("SELECT 1 FROM batches WHERE payout_batch_id IS NULL")).length;
      const outcomes = new Map<string, number>();
      for (const event of mock.events) {
        const { headers, body } = mock.signedWebhook(event);
        const outcome = await handleWebhook(db, paypal, headers, body);
        outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
      }
      const named = unnamed - (await db.query("SELECT 1 FROM batches WHERE payout_batch_id IS NULL")).length;
      say(`${label}${mock.events.length} delivered late: ${outcomes.get("applied") ?? 0} applied, ${(outcomes.get("ignored") ?? 0) + (outcomes.get("duplicate") ?? 0)} already known; ${named} unnamed batch(es) named`);
      continue;
    }
    if (crashAt) {
      const crashed = await runStep(step, env, crashAt);
      if (crashed.signal !== "SIGKILL") throw new Error(`${step} was meant to die at ${crashAt}, but exited ${crashed.code ?? crashed.signal}: ${crashed.stdout}`);
      kills += 1;
      say(`${label}KILLED at ${crashAt}`);
      await new Promise((r) => setTimeout(r, 1200)); // the dead process's outbox lease runs out
    }
    const done = await runStep(step, env);
    if (done.code !== 0) throw new Error(`${step} failed on restart: ${done.stdout}`);
    say(`${crashAt ? `${" ".repeat(22)}restarted -> ` : label}${done.stdout}`);
  }

  // --- The audit: PayPal's ledger against Ringfence's records ---
  const report = await reconcile(db, mock);
  const batches = new Map((await db.query<{ sender_batch_id: string; run_id: string }>("SELECT sender_batch_id, run_id FROM batches")).map((b) => [b.sender_batch_id, b.run_id] as const));
  const ledger = mock.ledger();
  const perRunItem = new Map<string, number>();
  let unknownBatches = 0;
  for (const item of ledger) {
    const run = batches.get(item.sender_batch_id ?? "");
    if (!run) unknownBatches += 1;
    const key = `${run}/${item.payout_item.sender_item_id}`;
    perRunItem.set(key, (perRunItem.get(key) ?? 0) + 1);
  }
  const duplicates = [...perRunItem.values()].filter((n) => n > 1).length;
  const items = await withProgram(db, PROGRAM, (q) =>
    q.query<{ run_id: string; sender_item_id: string; state: string; amount_value: string }>(
      "SELECT run_id, sender_item_id, state, amount_value FROM items WHERE program_id = $1",
      [PROGRAM],
    ),
  );
  if (items.length === 0) throw new Error("the audit read no items: it must be scoped to the program (row-level security)");
  const shouldBePaid = items.filter((i) => ["sent", "paid", "unclaimed", "returned", "failed"].includes(i.state));
  const missing = shouldBePaid.filter((i) => (perRunItem.get(`${i.run_id}/${i.sender_item_id}`) ?? 0) !== 1).length;
  const leakedHolds = items.filter((i) => ["held", "blocked"].includes(i.state) && perRunItem.has(`${i.run_id}/${i.sender_item_id}`)).length;
  const cancelEvents = mock.events.filter((e) => e.event_type === "PAYMENT.PAYOUTS-ITEM.CANCELED");
  const returned = items.filter((i) => i.state === "returned");
  const count = (state: string) => items.filter((i) => i.state === state).length;

  say();
  say("Audit, PayPal's ledger against Ringfence's records");
  const rows: Array<[string, string | number]> = [
    ["processes killed mid-flight", kills],
    ["PayPal batches / payout items created", `${new Set(ledger.map((i) => i.payout_batch_id)).size} / ${ledger.length}`],
    ["payees paid more than once in a run", duplicates],
    ["payees Ringfence sent that PayPal never paid", missing],
    ["held or blocked payees PayPal paid anyway", leakedHolds],
    ["PayPal batches Ringfence doesn't know", unknownBatches],
    ["cancels at PayPal / items returned", `${cancelEvents.length} / ${returned.length} ($${returned.reduce((s, i) => s + Number(i.amount_value), 0)})`],
    ["reconciler gaps", report.gaps.length],
    ["paid / unclaimed / held / blocked", `${count("paid")} / ${count("unclaimed")} / ${count("held")} / ${count("blocked")}`],
  ];
  for (const [k, v] of rows) say(`  ${k.padEnd(46)}${v}`);
  const ok = duplicates === 0 && missing === 0 && leakedHolds === 0 && unknownBatches === 0 && cancelEvents.length === returned.length && report.gaps.length === 0;
  say();
  say(ok ? `RESULT: zero duplicates. Every payee paid exactly once, across ${kills} kills at 5 crash points.` : "RESULT: FAILED, see the audit above.");

  writeFileSync(new URL("../docs/chaos-run.txt", import.meta.url), `${out.join("\n")}\n`);
  console.log("\nRecorded in docs/chaos-run.txt");
  return ok;
}

const stepIndex = process.argv.indexOf("--step");
(stepIndex === -1 ? parent() : child(process.argv[stepIndex + 1] ?? "")).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
