import type { Metadata } from "next";
import { connection } from "next/server";
import { narrateClaims } from "@ringfence/agents";
import { buildDemo } from "@/lib/demo";
import { parseDemoWeek } from "@/lib/fixtures";
import { sharedLlmSpendCap } from "@/lib/llm-spend-cap";
import { Decisions } from "./decisions";

export const metadata: Metadata = { title: "Decisions" };

// buildDemo caches each week, so a case file is the same object on every request: narrate it once
// per server process instead of a Gemini round trip per ring on every visit. A fallback (no key,
// quota, error) comes back as the input itself and isn't kept, so the next visit tries again.
type CaseFile = Parameters<typeof narrateClaims>[0];
const narrated = new WeakMap<CaseFile, Promise<CaseFile>>();
function narrateOnce(caseFile: CaseFile): Promise<CaseFile> {
  let p = narrated.get(caseFile);
  if (!p) {
    narrated.set(caseFile, (p = narrateClaims(caseFile, { spendCap: sharedLlmSpendCap() })));
    p.then((out) => out === caseFile && narrated.delete(caseFile), () => narrated.delete(caseFile));
  }
  return p;
}

export default async function DecisionsPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string; case?: string; tab?: string }> }) {
  await connection();
  const { week, adjusted, case: caseId, tab } = await searchParams;
  const data = buildDemo(parseDemoWeek(week), adjusted === "1");
  // A ring's checked case file, rewritten into plain sentences by the one real model call when
  // GEMINI_API_KEY is set (under the spend cap); otherwise its scripted sentences, unchanged.
  const cases = await Promise.all(data.cases.map(async (c) => (c.caseFile ? { ...c, caseFile: await narrateOnce(c.caseFile) } : c)));
  // key: a new week (or case link) starts the page fresh instead of keeping the last selection.
  return <Decisions key={`${data.week}${data.adjusted}${caseId ?? ""}${tab ?? ""}`} data={{ ...data, cases }} initialCase={caseId} initialTab={tab} />;
}
