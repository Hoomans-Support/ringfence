-- Ringfence schema. Applied at every startup: idempotent (IF NOT EXISTS / DROP-then-CREATE for
-- policies), inside one transaction behind an advisory lock so the API and worker booting together
-- can't race each other. One file until there's a deployed database worth versioned migrations.
BEGIN;
SELECT pg_advisory_xact_lock(7240117);

CREATE TABLE IF NOT EXISTS programs (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,  -- sha256 of the program's API key; the key itself is never stored
  mcp_key_hash text UNIQUE,           -- sha256 of the read-only key AI agents use over MCP
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  program_id       text NOT NULL REFERENCES programs (id),
  run_id           text NOT NULL,          -- the caller's sender_batch_id
  email_subject    text,
  rule_set_version text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, run_id)
);

-- One row per payee per run, and the per-item state machine (apps/api/src/states.ts):
--   held -> queued | blocked      queued -> sent      sent -> paid | unclaimed | returned | failed
--   unclaimed -> paid | returned | failed             paid -> failed (refunded or reversed)
CREATE TABLE IF NOT EXISTS items (
  program_id     text NOT NULL,
  run_id         text NOT NULL,
  sender_item_id text NOT NULL,
  receiver       text NOT NULL,
  amount_value   text NOT NULL,            -- PayPal's own decimal string, e.g. "20.00"
  currency       text NOT NULL,
  context        jsonb NOT NULL,           -- Ringfence's context block; ip_prefix stored hashed
  decision       text NOT NULL CHECK (decision IN ('PAY', 'HOLD', 'BLOCK')),
  ring_id        text,
  hold_group_id  text,
  reasons        jsonb NOT NULL,
  rules          jsonb NOT NULL,           -- every rule behind the decision (FR-4)
  state          text NOT NULL CHECK (state IN ('held', 'blocked', 'queued', 'sent', 'paid', 'unclaimed', 'returned', 'failed')),
  batch_id       text,                     -- the sender_batch_id it was queued in; fixed once set
  payout_item_id text,
  paypal_status  text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, run_id, sender_item_id),
  FOREIGN KEY (program_id, run_id) REFERENCES runs (program_id, run_id)
);
CREATE INDEX IF NOT EXISTS items_by_batch ON items (batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS items_by_payout_item ON items (payout_item_id) WHERE payout_item_id IS NOT NULL;

-- One row per PayPal batch. Not tenant-scoped on purpose: it holds ids and statuses only, no payee
-- data, and the worker and webhook handler need it to find which program a PayPal batch belongs
-- to. sender_batch_id is globally unique because PayPal dedupes it per PayPal account, and a
-- deployment runs on one PayPal account (per-program credentials would make this per-program).
CREATE TABLE IF NOT EXISTS batches (
  sender_batch_id text PRIMARY KEY,
  program_id      text NOT NULL REFERENCES programs (id),
  run_id          text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('run', 'release', 'import')),  -- import: paid before Ringfence, tracked only
  payout_batch_id text UNIQUE,
  batch_status    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The transactional outbox: written in the same transaction as the decision that needs it, drained
-- by the executor. UNIQUE (kind, ref) makes enqueueing the same work twice a no-op.
CREATE TABLE IF NOT EXISTS outbox (
  id           bigserial PRIMARY KEY,
  program_id   text NOT NULL REFERENCES programs (id),
  kind         text NOT NULL CHECK (kind IN ('create_batch', 'cancel_item')),
  ref          text NOT NULL,              -- sender_batch_id, or payout_item_id for a cancel
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  attempts     integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  done_at      timestamptz,
  UNIQUE (kind, ref)
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox (id) WHERE status = 'pending';

-- Learned rules, versioned (FR-4, FR-11): proposing an id again adds a version. Only an approved
-- version applies to new runs, and it carries its provenance: the ring it came from, its backtest,
-- its red-team score, and who approved it.
CREATE TABLE IF NOT EXISTS rules (
  program_id  text NOT NULL REFERENCES programs (id),
  rule_id     text NOT NULL,
  version     integer NOT NULL,
  body        jsonb NOT NULL,              -- { id, action, when: { all: [...] } }
  source      text,
  status      text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved')),
  backtest    jsonb,
  red_team    jsonb,
  flags       jsonb NOT NULL DEFAULT '[]', -- e.g. "holds_over_5_percent": needs a deliberate second look
  approved_by text,
  approved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, rule_id, version)
);

-- Devices and normalized payout addresses from rings this program confirmed (starter rule S-02).
CREATE TABLE IF NOT EXISTS known_fraud (
  program_id text NOT NULL REFERENCES programs (id),
  kind       text NOT NULL CHECK (kind IN ('device', 'payout_address')),
  value      text NOT NULL,
  ring_id    text NOT NULL,
  run_id     text NOT NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, kind, value)
);

-- Confirmed rings' devices and payout addresses, shared across every program as one-way keyed
-- hashes (FR-19, S-03 in packages/engine/src/rules.ts): never the raw value, and no ring_id or
-- run_id travels with it, so a hash on its own tells another program nothing but "a ring somewhere
-- had this". program_id here is who contributed it (for audit, never read by a match lookup); RLS
-- below restricts inserting to a program's own hashes, but deliberately leaves matching open to
-- every program, since checking "has anyone seen this fingerprint" is the entire point.
CREATE TABLE IF NOT EXISTS network_fingerprints (
  hash       text PRIMARY KEY,
  program_id text NOT NULL REFERENCES programs (id),
  added_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE network_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_fingerprints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS insert_own ON network_fingerprints;
CREATE POLICY insert_own ON network_fingerprints FOR INSERT WITH CHECK (program_id = current_setting('app.program_id', true));
DROP POLICY IF EXISTS match_any ON network_fingerprints;
CREATE POLICY match_any ON network_fingerprints FOR SELECT USING (true);

-- Every verified PayPal webhook, keyed by PayPal's event id: a redelivered event is recognized and
-- applied once. Ids and statuses only, no payee data, so like batches it isn't tenant-scoped.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id           text PRIMARY KEY,
  event_type         text NOT NULL,
  payout_batch_id    text,
  payout_item_id     text,
  transaction_status text,
  applied            boolean NOT NULL DEFAULT false,
  received_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  program_id text NOT NULL,
  actor      text NOT NULL,
  action     text NOT NULL,
  detail     jsonb NOT NULL DEFAULT '{}',
  at         timestamptz NOT NULL DEFAULT now()
);

-- Tenant isolation (NFR), as a backstop: queries already filter by program_id, and every row
-- holding payee data is also visible only inside a transaction that
-- set app.program_id (apps/api/src/db.ts, withProgram). FORCE applies it to the table owner too,
-- which is what Render's database user is. A superuser (e.g. local docker's default) bypasses it.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['runs', 'items', 'audit_log', 'rules', 'known_fraud'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant ON %I', t);
    EXECUTE format('CREATE POLICY tenant ON %I USING (program_id = current_setting(''app.program_id'', true)) WITH CHECK (program_id = current_setting(''app.program_id'', true))', t);
  END LOOP;
END $$;

COMMIT;
