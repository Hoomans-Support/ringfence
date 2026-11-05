/**
 * Ringfence's payout API (Fastify). Every /v1 route needs a program's API key as a Bearer token;
 * the key picks the program, and the program scopes every query (row-level security, db.ts).
 *
 *   npm start -w @ringfence/api      reads ../../.env; DATABASE_URL defaults to an in-memory PGlite
 */
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { PayPalClient } from "@ringfence/paypal";
import { boot } from "./boot";
import { startWorkerLoop } from "./loop";
import { ApiError, ensureProgram, programForKey, type Db } from "./db";
import { drainOutbox } from "./executor";
import { recordEvent, scorePending, type SignupEvent } from "./events";
import { confirmRing, releaseHolds, type ReleaseRequest } from "./holds";
import { approveRule, listRules, proposeRule, type Proposal } from "./learning";
import { explainRing, registerMcp } from "./mcp";
import { getRun, importPastRun, screenRun, submitRun, type RunRequest } from "./runs";
import { handleWebhook } from "./sync";

declare module "fastify" {
  interface FastifyRequest {
    programId: string;
    /** The body exactly as received: webhook signatures are checked against these bytes. */
    rawBody: string;
  }
}

const money = {
  type: "object",
  required: ["value", "currency"],
  properties: { value: { type: "string", pattern: "^\\d{1,10}(\\.\\d{1,2})?$" }, currency: { type: "string", pattern: "^[A-Z]{3}$" } },
};

// The PayPal Payouts request body (only the fields Ringfence reads are checked; anything else
// PayPal accepts passes through), plus Ringfence's optional context block.
const runBody = {
  type: "object",
  required: ["sender_batch_header", "items"],
  properties: {
    sender_batch_header: {
      type: "object",
      required: ["sender_batch_id"],
      properties: {
        // Shorter than PayPal's own limit, leaving room for the "-rel-<hash>" of release batches.
        sender_batch_id: { type: "string", minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_.:-]+$" },
        email_subject: { type: "string", maxLength: 255 },
      },
    },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 15_000,
      items: {
        type: "object",
        required: ["recipient_type", "receiver", "amount", "sender_item_id"],
        properties: {
          recipient_type: { const: "EMAIL" },
          receiver: { type: "string", maxLength: 127, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
          amount: money,
          sender_item_id: { type: "string", minLength: 1, maxLength: 63 },
          context: {
            type: "object",
            properties: {
              account_id: { type: "string", maxLength: 128 },
              signup_at: { type: "string", format: "date-time" },
              device_hash: { type: "string", maxLength: 128 },
              ip_prefix: { type: "string", maxLength: 64 },
              referrer_id: { type: "string", maxLength: 128 },
              answer: { type: "string", maxLength: 2000 },
              onboarding_seconds: { type: "number", minimum: 0 },
              activity_after_onboarding: { type: "integer", minimum: 0 },
            },
          },
        },
      },
    },
  },
} as const;

const importBody = {
  ...runBody,
  required: [...runBody.required, "payout_batch_id"],
  properties: { ...runBody.properties, payout_batch_id: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

// A rule's id is Ringfence's to give: a proposal says where a new rule was learned from, or which
// existing rule it revises (learning.ts).
const proposalBody = {
  type: "object",
  required: ["rule"],
  properties: {
    rule: { type: "object" },
    learned_from: {
      type: "object",
      required: ["ring_id", "run_id"],
      properties: { ring_id: { type: "string", pattern: "^R-[0-9]{2,}$" }, run_id: { type: "string", minLength: 1, maxLength: 100 } },
    },
    revises: { type: "string", pattern: "^R-[0-9]{2,}$" },
  },
} as const;

const eventBody = {
  type: "object",
  required: ["account_id"],
  properties: {
    account_id: { type: "string", minLength: 1, maxLength: 128 },
    receiver: { type: "string", maxLength: 127 },
    signup_at: { type: "string", format: "date-time" },
    device_hash: { type: "string", maxLength: 128 },
    ip_prefix: { type: "string", maxLength: 64 },
    referrer_id: { type: "string", maxLength: 128 },
    answer: { type: "string", maxLength: 2000 },
    onboarding_seconds: { type: "number", minimum: 0 },
  },
} as const;

const releaseBody = {
  type: "object",
  required: ["run_id"],
  properties: {
    run_id: { type: "string", minLength: 1 },
    sender_item_ids: { type: "array", maxItems: 15_000, items: { type: "string", maxLength: 63 } },
    hold_group_id: { type: "string", maxLength: 63 },
    released_by: { type: "string", maxLength: 255 },
  },
} as const;

export interface AppDeps {
  db: Db;
  paypal: PayPalClient;
  /** Send a new run's batch inside the request, so the response carries PayPal's batch id. The
   *  worker picks up anything this doesn't finish. */
  inlineSend?: boolean;
  /** Bearer token for GET /v1/webhooks/events; unset means the route answers 404. */
  adminToken?: string;
}

export function buildApp({ db, paypal, inlineSend = true, adminToken = process.env.ADMIN_TOKEN }: AppDeps): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" && !process.env.VITEST, bodyLimit: 16 * 1024 * 1024 });
  app.decorateRequest("programId", "");
  app.decorateRequest("rawBody", "");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    req.rawBody = body as string;
    try {
      done(null, body === "" ? {} : JSON.parse(body as string));
    } catch (err) {
      done(Object.assign(err as Error, { statusCode: 400 }), undefined);
    }
  });

  app.get("/health", async () => {
    await db.query("SELECT 1");
    return { ok: true, sandbox: true };
  });

  app.register(async (v1) => {
    v1.addHook("onRequest", async (req, reply) => {
      const key = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
      const auth = key ? await programForKey(db, key) : undefined;
      if (!auth) return reply.code(401).send({ error: "missing or unknown API key" });
      // The MCP key reads: it can screen and look things up, never send, release, confirm or approve.
      if (auth.scope === "read" && req.method !== "GET" && req.routeOptions.url !== "/v1/screen") {
        return reply.code(403).send({ error: "this key is read-only" });
      }
      req.programId = auth.programId;
    });

    v1.post<{ Body: RunRequest }>("/screen", { schema: { body: runBody } }, async (req) => screenRun(db, req.programId, req.body));

    // Event feed (FR-21, stretch): sign-ups and referrals reported during the week, ahead of payday.
    v1.post<{ Body: SignupEvent }>("/events", { schema: { body: eventBody } }, async (req, reply) => {
      await recordEvent(db, req.programId, req.body);
      return reply.code(202).send({ ok: true });
    });
    v1.get("/events/at-risk", async (req) => scorePending(db, req.programId));

    v1.get<{ Params: { id: string }; Querystring: { run_id: string } }>(
      "/rings/:id",
      { schema: { querystring: { type: "object", required: ["run_id"], properties: { run_id: { type: "string" } } } } },
      async (req, reply) => (await explainRing(db, req.programId, req.params.id, req.query.run_id)) ?? reply.code(404).send({ error: "no such hold group in that run" }),
    );

    v1.post<{ Body: RunRequest }>("/payout-runs", { schema: { body: runBody } }, async (req, reply) => {
      const { created, runId } = await submitRun(db, req.programId, req.body);
      let sent = true;
      if (created && inlineSend) {
        sent = await drainOutbox(db, paypal, { only: runId }).then(() => true, () => false);
      }
      const run = await getRun(db, req.programId, runId);
      return reply.code(!created ? 200 : sent ? 201 : 202).send(run);
    });

    // Day 0: a run already paid straight through PayPal, recorded so it's tracked and cancellable.
    v1.post<{ Body: RunRequest & { payout_batch_id: string } }>("/payout-runs/import", { schema: { body: importBody } }, async (req, reply) => {
      const { created, runId } = await importPastRun(db, req.programId, req.body, req.body.payout_batch_id);
      return reply.code(created ? 201 : 200).send(await getRun(db, req.programId, runId));
    });

    v1.get<{ Params: { id: string } }>("/payout-runs/:id", async (req, reply) => {
      const run = await getRun(db, req.programId, req.params.id);
      return run ?? reply.code(404).send({ error: "no such run" });
    });

    v1.post<{ Body: ReleaseRequest }>("/holds/release", { schema: { body: releaseBody } }, async (req, reply) => {
      const release = await releaseHolds(db, req.programId, req.body);
      let sent = true;
      if (release.created && inlineSend) {
        sent = await drainOutbox(db, paypal, { only: release.sender_batch_id }).then(() => true, () => false);
      }
      const [batch] = await db.query<{ payout_batch_id: string | null; batch_status: string | null }>(
        "SELECT payout_batch_id, batch_status FROM batches WHERE program_id = $1 AND sender_batch_id = $2",
        [req.programId, release.sender_batch_id],
      );
      return reply.code(!release.created ? 200 : sent ? 201 : 202).send({ ...release, ...batch });
    });

    v1.post<{ Params: { id: string }; Body: { run_id: string; confirmed_by?: string } }>(
      "/rings/:id/confirm",
      { schema: { body: { type: "object", required: ["run_id"], properties: { run_id: { type: "string" }, confirmed_by: { type: "string", maxLength: 255 } } } } },
      async (req) => {
        const confirmed = await confirmRing(db, req.programId, req.params.id, req.body);
        // The worker would cancel them within seconds anyway; doing it here shows the money back in the response's wake.
        if (inlineSend && confirmed.cancels_queued > 0) await drainOutbox(db, paypal).catch(() => 0);
        return confirmed;
      },
    );

    v1.get("/rules", async (req) => listRules(db, req.programId));

    v1.post<{ Body: Proposal }>("/rules", { schema: { body: proposalBody } }, async (req, reply) => reply.code(201).send(await proposeRule(db, req.programId, req.body)));

    v1.post<{ Params: { id: string }; Body: { approved_by: string; acknowledge_flags?: boolean } }>(
      "/rules/:id/approve",
      {
        schema: {
          body: { type: "object", required: ["approved_by"], properties: { approved_by: { type: "string", minLength: 1, maxLength: 255 }, acknowledge_flags: { type: "boolean" } } },
        },
      },
      async (req) => approveRule(db, req.programId, req.params.id, req.body.approved_by, req.body.acknowledge_flags),
    );
  }, { prefix: "/v1" });

  registerMcp(app, db);

  // PayPal webhooks: no API key, the signature is the authentication. /webhooks/paypal is the path
  // the first deployed service registered with PayPal, kept so that registration keeps working.
  const webhook = async (req: FastifyRequest, reply: FastifyReply) => {
    const outcome = await handleWebhook(db, paypal, req.headers, req.rawBody);
    return reply.code(outcome === "unverified" ? 400 : 200).send({ ok: outcome !== "unverified", outcome });
  };
  app.post("/v1/webhooks/paypal", webhook);
  app.post("/webhooks/paypal", webhook);

  app.get("/v1/webhooks/events", async (req, reply) => {
    if (!adminToken || req.headers.authorization !== `Bearer ${adminToken}`) return reply.code(404).send({ error: "not found" });
    return db.query("SELECT event_id, event_type, payout_batch_id, transaction_status, applied, received_at FROM webhook_events ORDER BY received_at DESC LIMIT 20");
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) return reply.code(err.statusCode).send({ error: err.message });
    if ((err as { validation?: unknown }).validation) return reply.code(400).send({ error: (err as Error).message });
    reply.log.error(err);
    return reply.code(500).send({ error: "internal error" });
  });

  return app;
}

/** The program this deployment serves, from its environment. Optional starting numbers
 *  (RINGFENCE_FIRST_RING_NUMBER, RINGFENCE_FIRST_RULE_NUMBER) are how the hosted demo's numbering
 *  starts where the PRD's story does; a real program leaves them unset and starts at 1. */
export async function ensureProgramFromEnv(db: Db, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (!env.RINGFENCE_API_KEY) return false;
  const start = (value: string | undefined) => (value && /^[1-9][0-9]*$/.test(value) ? Number(value) : undefined);
  await ensureProgram(db, env.RINGFENCE_PROGRAM_ID ?? "budgetapp", env.RINGFENCE_PROGRAM_NAME ?? "Budgeting app", env.RINGFENCE_API_KEY, env.RINGFENCE_MCP_KEY, {
    firstRingNumber: start(env.RINGFENCE_FIRST_RING_NUMBER),
    firstRuleNumber: start(env.RINGFENCE_FIRST_RULE_NUMBER),
  });
  return true;
}

async function main(): Promise<void> {
  const { db, paypal } = await boot();
  if (!(await ensureProgramFromEnv(db))) console.warn("RINGFENCE_API_KEY is not set: no program can authenticate");
  const app = buildApp({ db, paypal });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
  // The worker's loop in this process, instead of a separate worker service (render.yaml).
  const stopWorker = process.env.RINGFENCE_INLINE_WORKER === "true" ? startWorkerLoop(db, paypal) : async () => undefined;
  // Render sends SIGTERM before replacing an instance: finish in-flight requests and the loop's
  // current pass, then let go of the pool.
  process.once("SIGTERM", () => void Promise.all([app.close(), stopWorker()]).then(() => db.close()).then(() => process.exit(0)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
