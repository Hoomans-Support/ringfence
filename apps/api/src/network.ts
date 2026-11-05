/**
 * The ring network (FR-19, stretch): confirmed rings shared across programs as one-way keyed
 * hashes, never raw data, so "the second program holds the ring's payees on first sight without
 * seeing the first program's data" (PRD). HMAC-SHA256 under RINGFENCE_NETWORK_KEY turns a device
 * hash or normalized payout address into an opaque fingerprint before it ever leaves a program's
 * own transaction; only that fingerprint is shared, and only existence ("has anyone seen this
 * exact value") is ever asked of it.
 *
 * Missing RINGFENCE_NETWORK_KEY degrades to a no-op (publish does nothing, match finds nothing)
 * rather than failing a run: this is a P2 stretch signal, never load-bearing for the money path.
 */
import { createHmac } from "node:crypto";
import { type Queryable } from "./db";

type FingerprintKind = "device" | "payout_address";

function networkKey(): string | undefined {
  return process.env.RINGFENCE_NETWORK_KEY;
}

function fingerprint(key: string, kind: FingerprintKind, value: string): string {
  return createHmac("sha256", key).update(`${kind}:${value}`).digest("hex");
}

/** Publishes a confirmed ring's devices and payout addresses to the network as keyed hashes
 *  (holds.ts's confirmRing, right after they join this program's own confirmed-fraud list). */
export async function publishToNetwork(q: Queryable, programId: string, devices: Iterable<string>, payoutAddresses: Iterable<string>): Promise<void> {
  const key = networkKey();
  if (!key) return;
  const hashes = [
    ...[...new Set(devices)].map((v) => fingerprint(key, "device", v)),
    ...[...new Set(payoutAddresses)].map((v) => fingerprint(key, "payout_address", v)),
  ];
  if (hashes.length === 0) return;
  await q.query(
    `INSERT INTO network_fingerprints (hash, program_id) SELECT h, $1 FROM unnest($2::text[]) AS h ON CONFLICT (hash) DO NOTHING`,
    [programId, hashes],
  );
}

/** Which of these devices/payout addresses match a ring confirmed at *another* program. Only ever
 *  hands back plaintext values the caller already had (this run's own items); the network itself
 *  is only ever asked yes/no per hash, so neither program learns anything about the other's data. */
export async function matchNetwork(q: Queryable, devices: Iterable<string>, payoutAddresses: Iterable<string>): Promise<{ devices: Set<string>; payoutAddresses: Set<string> }> {
  const empty = { devices: new Set<string>(), payoutAddresses: new Set<string>() };
  const key = networkKey();
  if (!key) return empty;

  const deviceList = [...new Set(devices)];
  const addressList = [...new Set(payoutAddresses)];
  if (deviceList.length === 0 && addressList.length === 0) return empty;

  const deviceHashes = deviceList.map((v) => fingerprint(key, "device", v));
  const addressHashes = addressList.map((v) => fingerprint(key, "payout_address", v));
  const found = new Set((await q.query<{ hash: string }>("SELECT hash FROM network_fingerprints WHERE hash = ANY($1::text[])", [[...deviceHashes, ...addressHashes]])).map((r) => r.hash));

  return {
    devices: new Set(deviceList.filter((_, i) => found.has(deviceHashes[i]!))),
    payoutAddresses: new Set(addressList.filter((_, i) => found.has(addressHashes[i]!))),
  };
}
