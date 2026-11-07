import type { Metadata } from "next";
import { connection } from "next/server";
import { buildDemo } from "@/lib/demo";
import { parseDemoWeek } from "@/lib/fixtures";
import { Overview } from "./overview";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();
  const { week, adjusted } = await searchParams;
  return <Overview data={buildDemo(parseDemoWeek(week), adjusted === "1")} />;
}
