// Loads the demo fixtures from the repo-root fixtures/ directory. Resolved relative to this
// file's own location (not process.cwd()), so it works the same whether Next is started from
// the repo root or from apps/console. B never calls real PayPal — everything here is fixture data
// run through @ringfence/engine's scoreRun.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PayoutRun } from "@ringfence/engine";

export type TruthGroup = "ring" | "roommates" | "coworkers" | "honest";

export interface GroundTruthLabel {
  sender_item_id: string;
  account_id: string;
  group: TruthGroup;
  ring_label?: string;
}

// apps/console/lib/fixtures.ts -> apps/console/lib -> apps/console -> apps -> repo root
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const FIXTURES_DIR = path.join(REPO_ROOT, "fixtures");

export function loadWeek1Run(): PayoutRun {
  const raw = readFileSync(path.join(FIXTURES_DIR, "week1.json"), "utf-8");
  return JSON.parse(raw) as PayoutRun;
}

export function loadWeek1Truth(): GroundTruthLabel[] {
  const raw = readFileSync(path.join(FIXTURES_DIR, "week1.truth.json"), "utf-8");
  return JSON.parse(raw) as GroundTruthLabel[];
}
