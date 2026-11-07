import type { Metadata } from "next";
import { connection } from "next/server";
import { parseDemoWeek } from "@/lib/fixtures";
import { buildRulesPage } from "@/lib/rules";
import { LearnedRules } from "./learned-rules";

export const metadata: Metadata = { title: "Learned rules" };

export default async function RulesPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();
  const { week, adjusted } = await searchParams;
  const page = buildRulesPage(parseDemoWeek(week), adjusted === "1");
  return <LearnedRules key={`${page.data.week}${page.data.adjusted}`} page={page} />;
}
