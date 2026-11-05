/**
 * The MCP server for AI agents that pay people (FR-18): two read-only tools, served at POST /mcp
 * on the API itself (Streamable HTTP, stateless, Bearer key).
 *
 *   screen_payees   the decisions POST /v1/payout-runs would make right now, from the same
 *                   function (runs.ts, decideRun), with nothing stored and nothing sent
 *   explain_ring    a held ring's reasons and its case file, every claim re-checked against the
 *                   stored data (packages/agents), payee emails masked before an agent sees them
 *
 * There is no tool to send, release, unblock or change a rule, and the read-only MCP key is
 * refused by every API route that would (server.ts).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { checkClaims, investigate } from "@ringfence/agents";
import { maskEmail, type PayoutItem, type PayoutRun, type RingSummary } from "@ringfence/engine";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { programForKey, withProgram, type Db } from "./db";
import { screenRun } from "./runs";

export interface RingExplanation {
  /** The hold group: a ring (R-12), a pair (P-01), or the payouts one learned rule held (rule:R-07). */
  hold_group_id: string;
  kind: "ring" | "pair" | "rule";
  /** Set only when the hold group is a ring. */
  ring_id: string | null;
  run_id: string;
  size: number;
  reasons: string[];
  rules: string[];
  members: Array<{ sender_item_id: string; payee: string; state: string }>;
  case_file: { claims_checked: string; claims: Array<{ text: string; evidence: unknown }> };
}

/** Every email-shaped string in `value` masked (privacy NFR: emails are masked before anything
 *  reaches a model). A claim's evidence can carry one, e.g. an alias pattern's "name@domain" key. */
function maskEmails<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_key, v: unknown) => (typeof v === "string" && v.includes("@") ? maskEmail(v) : v)) as T;
}

/** A held ring (or any hold group, e.g. a learned rule's) as recorded in one run. */
export async function explainRing(db: Db, programId: string, ringId: string, runId: string): Promise<RingExplanation | undefined> {
  const rows = await withProgram(db, programId, (q) =>
    q.query<{ sender_item_id: string; receiver: string; amount_value: string; currency: string; context: PayoutItem["context"]; state: string; reasons: string[]; rules: string[]; ring_id: string | null }>(
      `SELECT sender_item_id, receiver, amount_value, currency, context, state, reasons, rules, ring_id FROM items
       WHERE program_id = $1 AND run_id = $2 AND (ring_id = $3 OR hold_group_id = $3) ORDER BY sender_item_id`,
      [programId, runId, ringId],
    ),
  );
  if (rows.length === 0) return undefined;

  const run: PayoutRun = {
    sender_batch_header: { sender_batch_id: runId },
    items: rows.map((r) => ({ recipient_type: "EMAIL", receiver: r.receiver, amount: { value: r.amount_value, currency: r.currency }, sender_item_id: r.sender_item_id, context: r.context })),
  };
  const reasons = [...new Set(rows.flatMap((r) => r.reasons))];
  const ring: RingSummary = { ring_id: ringId, member_sender_item_ids: rows.map((r) => r.sender_item_id), size: rows.length, reasons, louvain_clusters: 0 };
  const caseFile = checkClaims(investigate(ring, run), run);
  const ringIdOfGroup = rows[0]?.ring_id ?? null;
  return {
    hold_group_id: ringId,
    kind: ringIdOfGroup ? "ring" : ringId.startsWith("P-") ? "pair" : "rule",
    ring_id: ringIdOfGroup,
    run_id: runId,
    size: rows.length,
    reasons,
    rules: [...new Set(rows.flatMap((r) => r.rules))],
    members: rows.map((r) => ({ sender_item_id: r.sender_item_id, payee: maskEmail(r.receiver), state: r.state })),
    case_file: {
      claims_checked: `${caseFile.claims_checked.checked} of ${caseFile.claims_checked.total}`,
      // A claim the checker couldn't confirm against the data is never passed on (FR-9).
      claims: caseFile.claims.filter((c) => c.checked).map((c) => ({ text: c.text, evidence: maskEmails(c.check) })),
    },
  };
}

const payee = z.object({
  recipient_type: z.literal("EMAIL").default("EMAIL"),
  receiver: z.string().max(127).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/),
  amount: z.object({ value: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), currency: z.string().regex(/^[A-Z]{3}$/) }),
  sender_item_id: z.string().min(1).max(63),
  context: z
    .object({
      account_id: z.string().max(128),
      signup_at: z.string().datetime({ offset: true }),
      device_hash: z.string().max(128),
      ip_prefix: z.string().max(64),
      referrer_id: z.string().max(128),
      answer: z.string().max(2000),
      onboarding_seconds: z.number().min(0),
      activity_after_onboarding: z.number().int().min(0),
    })
    .partial()
    .optional(),
});

const asText = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

function serverFor(db: Db, programId: string): McpServer {
  const server = new McpServer({ name: "ringfence", version: "0.0.1" });

  server.registerTool(
    "screen_payees",
    {
      title: "Screen payees before paying them",
      description:
        "Checks a list of payees, in the PayPal Payouts item format plus optional context, against this program's rings, learned rules and confirmed fraud. Returns PAY, HOLD or BLOCK per payee, with ring ids and the rules and signals behind each decision: the same decisions sending the run through Ringfence's API would get right now. Read-only: nothing is stored, sent or paid. Send the run through Ringfence's API to pay; Ringfence screens it again there.",
      inputSchema: { payees: z.array(payee).min(1).max(15_000) },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ payees }) => asText(await screenRun(db, programId, { sender_batch_header: { sender_batch_id: "mcp_screen" }, items: payees })),
  );

  server.registerTool(
    "explain_ring",
    {
      title: "Explain a hold group",
      description:
        "Explains why a hold group in a run was held: a ring of linked accounts, a pair, or the payouts one learned rule held. Returns its kind, its signals, the rules that held it, its members (emails masked), and its case file, where every claim has been re-checked against the run's data. Read-only. There is no tool to release or unblock anyone; a person decides that in the Ringfence console.",
      inputSchema: { ring_id: z.string().min(1).max(63).describe('The hold group: a ring such as "R-12", a pair such as "P-01", or a learned rule\'s hold group such as "rule:R-07"'), run_id: z.string().min(1).max(100) },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ ring_id, run_id }) => {
      const explained = await explainRing(db, programId, ring_id, run_id);
      return explained ? asText(explained) : { ...asText({ error: `no hold group ${ring_id} in run ${run_id}` }), isError: true };
    },
  );

  return server;
}

/** POST /mcp: a fresh server and transport per request (stateless), scoped to the key's program.
 *  Either the program's API key or its read-only MCP key works; the tools are read-only either way. */
export function registerMcp(app: FastifyInstance, db: Db): void {
  app.post("/mcp", async (req, reply) => {
    const key = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
    const auth = key ? await programForKey(db, key) : undefined;
    if (!auth) return reply.code(401).send({ error: "missing or unknown key" });

    const server = serverFor(db, auth.programId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.hijack();
    reply.raw.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });
  // Stateless: no session to stream to or end.
  const notAllowed = async (_req: FastifyRequest, reply: FastifyReply) => reply.code(405).send({ error: "POST only" });
  app.get("/mcp", notAllowed);
  app.delete("/mcp", notAllowed);
}
