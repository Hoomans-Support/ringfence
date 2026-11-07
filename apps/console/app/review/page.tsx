import type { Metadata } from "next";
import { connection } from "next/server";
import { narrateClaims } from "@ringfence/agents";
import { buildDemo } from "@/lib/demo";
import { parseDemoWeek } from "@/lib/fixtures";
import { sharedLlmSpendCap } from "@/lib/llm-spend-cap";
import { Decisions } from "./decisions";

export const metadata: Metadata = { title: "Decisions" };

export default async function DecisionsPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string; case?: string; tab?: string }> }) {
  await connection();
  const { week, adjusted, case: caseId, tab } = await searchParams;
  const data = buildDemo(parseDemoWeek(week), adjusted === "1");
  // A ring's checked case file, rewritten into plain sentences by the one real model call when
  // GEMINI_API_KEY is set (under the spend cap); otherwise its scripted sentences, unchanged.
  const cases = await Promise.all(data.cases.map(async (c) => (c.caseFile ? { ...c, caseFile: await narrateClaims(c.caseFile, { spendCap: sharedLlmSpendCap() }) } : c)));
  // key: a new week (or case link) starts the page fresh instead of keeping the last selection.
  return <Decisions key={`${data.week}${data.adjusted}${caseId ?? ""}${tab ?? ""}`} data={{ ...data, cases }} initialCase={caseId} initialTab={tab} />;
}
