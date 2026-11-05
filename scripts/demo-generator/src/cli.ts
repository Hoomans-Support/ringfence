/**
 * Writes Week 0-4 and survey-app fixtures to the repo-root `fixtures/` directory.
 * Each run and its ground truth remain separate so the engine never evaluates itself against the
 * answer key. Week 4 also has scenario-only recovery metadata in `week4.demo.json`.
 *
 * Usage: npm run demo:generate [-- --seed 42]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateWeek0, generateWeek1, generateWeek2, generateWeek3, generateWeek4, generateSurveyApp } from "./index";

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

  const weeks = [
    ["week0", generateWeek0(seed)],
    ["week1", generateWeek1(seed)],
    ["week2", generateWeek2(seed)],
    ["week3", generateWeek3(seed)],
    ["week4", generateWeek4(seed)],
    ["surveyapp", generateSurveyApp(seed)],
  ] as const;
  for (const [name, { run, truth, demo }] of weeks) {
    writeFileSync(join(fixturesDir, `${name}.json`), `${JSON.stringify(run, null, 2)}\n`);
    writeFileSync(join(fixturesDir, `${name}.truth.json`), `${JSON.stringify(truth, null, 2)}\n`);
    if (demo) writeFileSync(join(fixturesDir, `${name}.demo.json`), `${JSON.stringify(demo, null, 2)}\n`);
    console.log(`Wrote fixtures/${name}.json (${run.items.length} items) and fixtures/${name}.truth.json`);
  }
  console.log(`Seed=${seed}`);
}

main();
