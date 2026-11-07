import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DEMO_TODAY } from "@/lib/demo";
import { buildHoldCalendarData } from "@/lib/hold-calendar-data";
import { parseDemoWeek } from "@/lib/fixtures";
import { HoldCalendar } from "./hold-calendar";

export const metadata: Metadata = { title: "Hold calendar" };

export default async function HoldCalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();
  const { week: rawWeek, adjusted: rawAdjusted } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const adjusted = rawAdjusted === "1";
  const { resources, events } = buildHoldCalendarData(week, adjusted);

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <Link href={`/review?week=${week}${adjusted ? "&adjusted=1" : ""}`} className="text-sm font-medium text-rf-slate hover:text-rf-ink">← Decisions</Link>
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">DECISIONS · DEADLINES</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">Hold calendar</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">
          Every paused group gets 7 days from sign-up before its decision is due. One row per group, soonest deadline on top, so nothing waits past its limit unnoticed.
        </p>
      </section>

      {resources.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-rf-slate p-6 text-[15px] text-rf-slate">Nothing paused this week, so nothing on the calendar.</div>
      ) : (
        <HoldCalendar resources={resources} events={events} today={DEMO_TODAY[week]!} />
      )}

      <p className="text-xs text-rf-slate">
        The 7 days count from sign-up, standing in for the hold&apos;s own timestamp, as Decisions does. Times are UTC+7.
      </p>
    </main>
  );
}
