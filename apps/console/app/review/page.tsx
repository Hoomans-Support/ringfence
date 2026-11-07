import type { Metadata } from "next";
import { connection } from "next/server";
import { buildDemo } from "@/lib/demo";
import { parseDemoWeek } from "@/lib/fixtures";
import { Decisions } from "./decisions";

export const metadata: Metadata = { title: "Decisions" };

export default async function DecisionsPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string; case?: string; tab?: string }> }) {
  await connection();
  const { week, adjusted, case: caseId, tab } = await searchParams;
  const data = buildDemo(parseDemoWeek(week), adjusted === "1");
  // key: a new week (or case link) starts the page fresh instead of keeping the last selection.
  return <Decisions key={`${data.week}${data.adjusted}${caseId ?? ""}${tab ?? ""}`} data={data} initialCase={caseId} initialTab={tab} />;
}
