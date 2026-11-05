/**
 * The database seam: one tiny interface over node-postgres (Render, local docker) and PGlite
 * (Postgres compiled to WASM, for tests and for running locally with no database at all:
 * DATABASE_URL=pglite://memory, or pglite:./.data for one that survives restarts).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

const SCHEMA = new URL("../../../db/schema.sql", import.meta.url);

export async function connect(url = process.env.DATABASE_URL ?? "pglite://memory"): Promise<Db> {
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = url.replace(/^pglite:(\/\/)?/, "");
    const lite = new PGlite(dir === "memory" ? undefined : dir);
    return {
      query: async (sql, params) => (await lite.query(sql, params)).rows as never,
      tx: (fn) => lite.transaction((t) => fn({ query: async (sql, params) => (await t.query(sql, params)).rows as never })),
      exec: async (sql) => void (await lite.exec(sql)),
      close: () => lite.close(),
    };
  }

  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return {
    query: async (sql, params) => (await pool.query(sql, params)).rows,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: async (sql, params) => (await client.query(sql, params)).rows });
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    exec: async (sql) => void (await pool.query(sql)),
    close: () => pool.end(),
  };
}

export async function migrate(db: Db): Promise<void> {
  await db.exec(readFileSync(SCHEMA, "utf8"));
}

/** Runs `fn` in a transaction scoped to one program: row-level security shows it only that
 *  program's runs, items and audit log. */
export function withProgram<T>(db: Db, programId: string, fn: (q: Queryable) => Promise<T>): Promise<T> {
  return db.tx(async (q) => {
    await q.query("SELECT set_config('app.program_id', $1, true)", [programId]);
    return fn(q);
  });
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** The demo budgeting app's starting numbers, so the live system tells the PRD's story without an
 *  answer key: its week 1 ring is R-12, and the rule learned from it R-07. render.yaml sets the same
 *  for the hosted app through RINGFENCE_FIRST_RING_NUMBER / RINGFENCE_FIRST_RULE_NUMBER. */
export const DEMO_NUMBERING = { firstRingNumber: 12, firstRuleNumber: 7 } as const;

/** Creates the program if it doesn't exist and (re)sets its keys. Starting numbers are a floor:
 *  they can move an existing program's numbering forward (never reusing a number), never back. */
export async function ensureProgram(
  db: Db,
  id: string,
  name: string,
  apiKey: string,
  mcpKey?: string,
  numbering: { firstRingNumber?: number; firstRuleNumber?: number } = {},
): Promise<void> {
  await db.query(
    `INSERT INTO programs (id, name, api_key_hash, mcp_key_hash, next_ring_number, next_rule_number) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, api_key_hash = EXCLUDED.api_key_hash, mcp_key_hash = EXCLUDED.mcp_key_hash,
       next_ring_number = GREATEST(programs.next_ring_number, EXCLUDED.next_ring_number),
       next_rule_number = GREATEST(programs.next_rule_number, EXCLUDED.next_rule_number)`,
    [id, name, sha256(apiKey), mcpKey ? sha256(mcpKey) : null, numbering.firstRingNumber ?? 1, numbering.firstRuleNumber ?? 1],
  );
}

/** "full" for the program's API key; "read" for its MCP key, which can screen and explain but
 *  never move money, release a hold or change a rule. */
export type KeyScope = "full" | "read";

export async function programForKey(db: Db, key: string): Promise<{ programId: string; scope: KeyScope } | undefined> {
  const [row] = await db.query<{ id: string; scope: KeyScope }>(
    "SELECT id, CASE WHEN api_key_hash = $1 THEN 'full' ELSE 'read' END AS scope FROM programs WHERE api_key_hash = $1 OR mcp_key_hash = $1",
    [sha256(key)],
  );
  return row ? { programId: row.id, scope: row.scope } : undefined;
}

/** A request the API refuses, with the status code to refuse it with. */
export class ApiError extends Error {
  constructor(readonly statusCode: 400 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

export async function audit(q: Queryable, programId: string, actor: string, action: string, detail: Record<string, unknown>): Promise<void> {
  await q.query("INSERT INTO audit_log (program_id, actor, action, detail) VALUES ($1, $2, $3, $4)", [programId, actor, action, JSON.stringify(detail)]);
}
