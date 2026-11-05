// Loads the demo fixtures from the repo-root fixtures/ directory. Resolved relative to this
// file's own location (not process.cwd()), so it works the same whether Next is started from
// the repo root or from apps/console. B never calls real PayPal — everything here is fixture data
// run through @ringfence/engine's scoreRun.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PayoutRun } from "@ringfence/engine";
import type { WeekDemoMetadata } from "@ringfence/demo-generator";

export type { GroundTruthLabel, TruthGroup } from "@ringfence/demo-generator";
import type { GroundTruthLabel } from "@ringfence/demo-generator";

export type DemoWeek = 0 | 1 | 2 | 3 | 4;

// apps/console/lib/fixtures.ts -> apps/console/lib -> apps/console -> apps -> repo root
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const FIXTURES_DIR = path.join(REPO_ROOT, "fixtures");

export function parseDemoWeek(value: string | undefined): DemoWeek {
  if (value === "0") return 0;
  if (value === "2") return 2;
  if (value === "3") return 3;
  if (value === "4") return 4;
  return 1;
}

export function loadWeekRun(week: DemoWeek): PayoutRun {
  const raw = readFileSync(path.join(FIXTURES_DIR, `week${week}.json`), "utf-8");
  return JSON.parse(raw) as PayoutRun;
}

export function loadWeekTruth(week: DemoWeek): GroundTruthLabel[] {
  const raw = readFileSync(path.join(FIXTURES_DIR, `week${week}.truth.json`), "utf-8");
  return JSON.parse(raw) as GroundTruthLabel[];
}

export function loadWeekDemoMetadata(week: DemoWeek): WeekDemoMetadata | null {
  const file = path.join(FIXTURES_DIR, `week${week}.demo.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf-8")) as WeekDemoMetadata;
}

export const loadWeek1Run = () => loadWeekRun(1);
export const loadWeek1Truth = () => loadWeekTruth(1);
