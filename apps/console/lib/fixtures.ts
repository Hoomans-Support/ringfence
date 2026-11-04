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

export type DemoWeek = 0 | 1 | 2;

// apps/console/lib/fixtures.ts -> apps/console/lib -> apps/console -> apps -> repo root
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const FIXTURES_DIR = path.join(REPO_ROOT, "fixtures");

export function parseDemoWeek(value: string | undefined): DemoWeek {
  return value === "0" ? 0 : value === "2" ? 2 : 1;
}

export function loadWeekRun(week: DemoWeek): PayoutRun {
  const raw = readFileSync(path.join(FIXTURES_DIR, `week${week}.json`), "utf-8");
  return JSON.parse(raw) as PayoutRun;
}

export function loadWeekTruth(week: DemoWeek): GroundTruthLabel[] {
  const raw = readFileSync(path.join(FIXTURES_DIR, `week${week}.truth.json`), "utf-8");
  return JSON.parse(raw) as GroundTruthLabel[];
}

export const loadWeek1Run = () => loadWeekRun(1);
export const loadWeek1Truth = () => loadWeekTruth(1);
