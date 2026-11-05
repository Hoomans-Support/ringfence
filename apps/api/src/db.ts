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

export interface StartingNumbers {
  startRing?: number;
  startPair?: number;
  startRule?: number;
}

/** Creates the program if it doesn't exist and (re)sets its keys. `startingNumbers` only takes
 *  effect on creation (issue #2, #6: the demo program's "ring R-12, rule R-07" story) — re-running
 *  this on every boot, as server.ts does, must never reset a program's counters once they've moved
 *  forward, so the ON CONFLICT path leaves them alone. */
export async function ensureProgram(db: Db, id: string, name: string, apiKey: string, mcpKey?: string, startingNumbers?: StartingNumbers): Promise<void> {
  await db.query(
    `INSERT INTO programs (id, name, api_key_hash, mcp_key_hash, next_ring_number, next_pair_number, next_rule_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, api_key_hash = EXCLUDED.api_key_hash, mcp_key_hash = EXCLUDED.mcp_key_hash`,
    [id, name, sha256(apiKey), mcpKey ? sha256(mcpKey) : null, startingNumbers?.startRing ?? 1, startingNumbers?.startPair ?? 1, startingNumbers?.startRule ?? 1],
  );
}

export interface NumberOffsets {
  startRing: number;
  startPair: number;
}

/** Atomically reserves `rings` ring numbers and `pairs` pair numbers for a real run, advancing the
 *  program's counters inside the caller's transaction so a rollback never burns a number. */
export async function reserveNumbers(q: Queryable, programId: string, counts: { rings: number; pairs: number }): Promise<NumberOffsets> {
  const [row] = await q.query<{ start_ring: number; start_pair: number }>(
    `UPDATE programs SET next_ring_number = next_ring_number + $2, next_pair_number = next_pair_number + $3
     WHERE id = $1 RETURNING next_ring_number - $2 AS start_ring, next_pair_number - $3 AS start_pair`,
    [programId, counts.rings, counts.pairs],
  );
  if (!row) throw new ApiError(404, `no program ${programId}`);
  return { startRing: row.start_ring, startPair: row.start_pair };
}

/** The numbers a run would get right now, without consuming them — what a screen shows so it agrees
 *  with the run that follows it (issue #2). */
export async function peekNumbers(q: Queryable, programId: string): Promise<NumberOffsets> {
  const [row] = await q.query<{ next_ring_number: number; next_pair_number: number }>("SELECT next_ring_number, next_pair_number FROM programs WHERE id = $1", [programId]);
  if (!row) throw new ApiError(404, `no program ${programId}`);
  return { startRing: row.next_ring_number, startPair: row.next_pair_number };
}

/** Atomically assigns the next rule number for a brand-new learned rule (issue #3). */
export async function reserveRuleNumber(q: Queryable, programId: string): Promise<number> {
  const [row] = await q.query<{ assigned: number }>(
    "UPDATE programs SET next_rule_number = next_rule_number + 1 WHERE id = $1 RETURNING next_rule_number - 1 AS assigned",
    [programId],
  );
  if (!row) throw new ApiError(404, `no program ${programId}`);
  return row.assigned;
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
