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

/** Creates the program if it doesn't exist and (re)sets its API key. */
export async function ensureProgram(db: Db, id: string, name: string, apiKey: string): Promise<void> {
  await db.query(
    `INSERT INTO programs (id, name, api_key_hash) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, api_key_hash = EXCLUDED.api_key_hash`,
    [id, name, sha256(apiKey)],
  );
}

export async function programForKey(db: Db, apiKey: string): Promise<string | undefined> {
  const [row] = await db.query<{ id: string }>("SELECT id FROM programs WHERE api_key_hash = $1", [sha256(apiKey)]);
  return row?.id;
}

/** A request the API refuses, with the status code to refuse it with. */
export class ApiError extends Error {
  constructor(readonly statusCode: 400 | 404 | 409, message: string) {
    super(message);
  }
}

export async function audit(q: Queryable, programId: string, actor: string, action: string, detail: Record<string, unknown>): Promise<void> {
  await q.query("INSERT INTO audit_log (program_id, actor, action, detail) VALUES ($1, $2, $3, $4)", [programId, actor, action, JSON.stringify(detail)]);
}
