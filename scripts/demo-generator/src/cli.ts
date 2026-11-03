/**
 * Writes the demo fixtures to the repo-root `fixtures/` directory:
 *   fixtures/week1.json        the PayPal-Payouts-shaped run (sent through scoreRun, then to A's executor)
 *   fixtures/week1.truth.json  ground-truth labels, kept separate so the engine is never tested against its own answer key by accident
 *
 * Usage: npm run demo:generate [-- --seed 42]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateWeek1 } from "./week1";

function readSeedArg(): number {
  const flagIndex = process.argv.indexOf("--seed");
  if (flagIndex === -1) return 42;
  const value = process.argv[flagIndex + 1];
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed)) throw new Error(`--seed expects a number, got ${value}`);
  return parsed;
}

function main(): void {
  const seed = readSeedArg();
  const fixturesDir = join(process.cwd(), "fixtures");
  mkdirSync(fixturesDir, { recursive: true });

  const { run, truth } = generateWeek1(seed);

  writeFileSync(join(fixturesDir, "week1.json"), `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(join(fixturesDir, "week1.truth.json"), `${JSON.stringify(truth, null, 2)}\n`);

  console.log(`Wrote fixtures/week1.json (${run.items.length} items) and fixtures/week1.truth.json, seed=${seed}`);
}

main();
