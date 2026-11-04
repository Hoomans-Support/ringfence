/**
 * Ringfence's payout API (Fastify). Every /v1 route needs a program's API key as a Bearer token;
 * the key picks the program, and the program scopes every query (row-level security, db.ts).
 *
 *   npm start -w @ringfence/api      reads ../../.env; DATABASE_URL defaults to an in-memory PGlite
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { createPayPalClient, type PayPalClient } from "@ringfence/paypal";
import { ApiError, connect, ensureProgram, migrate, programForKey, type Db } from "./db";
import { drainOutbox } from "./executor";
import type { Rule } from "@ringfence/engine";
import { confirmRing, releaseHolds, type ReleaseRequest } from "./holds";
import { approveRule, listRules, proposeRule } from "./learning";
import { getRun, submitRun, type RunRequest } from "./runs";
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
      const programId = key ? await programForKey(db, key) : undefined;
      if (!programId) return reply.code(401).send({ error: "missing or unknown API key" });
      req.programId = programId;
    });

    v1.post<{ Body: RunRequest }>("/payout-runs", { schema: { body: runBody } }, async (req, reply) => {
      const { created, runId } = await submitRun(db, req.programId, req.body);
      let sent = true;
      if (created && inlineSend) {
        sent = await drainOutbox(db, paypal, { only: runId }).then(() => true, () => false);
      }
      const run = await getRun(db, req.programId, runId);
      return reply.code(!created ? 200 : sent ? 201 : 202).send(run);
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
      async (req) => confirmRing(db, req.programId, req.params.id, req.body),
    );

    v1.get("/rules", async (req) => listRules(db, req.programId));

    v1.post<{ Body: { rule: Rule; source?: string } }>(
      "/rules",
      { schema: { body: { type: "object", required: ["rule"], properties: { rule: { type: "object" }, source: { type: "string", maxLength: 255 } } } } },
      async (req, reply) => reply.code(201).send(await proposeRule(db, req.programId, req.body.rule, req.body.source)),
    );

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

async function main(): Promise<void> {
  const envFile = new URL("../../../.env", import.meta.url);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const db = await connect();
  await migrate(db);
  if (process.env.RINGFENCE_API_KEY) {
    await ensureProgram(db, process.env.RINGFENCE_PROGRAM_ID ?? "budgetapp", process.env.RINGFENCE_PROGRAM_NAME ?? "Budgeting app", process.env.RINGFENCE_API_KEY);
  } else {
    console.warn("RINGFENCE_API_KEY is not set: no program can authenticate");
  }
  const app = buildApp({ db, paypal: createPayPalClient() });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
