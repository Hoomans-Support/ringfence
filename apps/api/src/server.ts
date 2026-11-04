/**
 * Ringfence's payout API (Fastify). Every /v1 route needs a program's API key as a Bearer token;
 * the key picks the program, and the program scopes every query (row-level security, db.ts).
 *
 *   npm start -w @ringfence/api      reads ../../.env; DATABASE_URL defaults to an in-memory PGlite
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import { createPayPalClient, type PayPalClient } from "@ringfence/paypal";
import { connect, ensureProgram, migrate, programForKey, type Db } from "./db";
import { drainOutbox } from "./executor";
import { getRun, RunRejected, submitRun, type RunRequest } from "./runs";

declare module "fastify" {
  interface FastifyRequest {
    programId: string;
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

export interface AppDeps {
  db: Db;
  paypal: PayPalClient;
  /** Send a new run's batch inside the request, so the response carries PayPal's batch id. The
   *  worker picks up anything this doesn't finish. */
  inlineSend?: boolean;
}

export function buildApp({ db, paypal, inlineSend = true }: AppDeps): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" && !process.env.VITEST, bodyLimit: 16 * 1024 * 1024 });
  app.decorateRequest("programId", "");

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
  }, { prefix: "/v1" });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof RunRejected) return reply.code(err.statusCode).send({ error: err.message });
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
