import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { buildHoldCalendarData } from "@/lib/hold-calendar-data";
import { parseDemoWeek } from "@/lib/fixtures";
import { HoldIcon } from "@/app/icons";
import { HoldCalendar } from "./hold-calendar";

export const metadata: Metadata = { title: "Hold calendar" };

export default async function HoldCalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await connection();

  const { week: rawWeek } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const { resources, events } = buildHoldCalendarData(week);

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 bg-rf-mist px-8 py-6 text-rf-ink">
      <div>
        <Link href={`/review?week=${week}`} className="text-sm font-medium text-rf-slate hover:text-rf-ink">
          ← Review queue
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-[32px] font-semibold tracking-[-0.03em]">
          <HoldIcon className="size-7 shrink-0" aria-hidden /> Hold calendar
        </h1>
        <p className="mt-1 text-[17px] leading-[1.55] text-rf-slate">
          When this week's holds expire, grouped by ring or pair — so a reviewer can plan which cases need attention first.
        </p>
        <nav aria-label="Demo week" className="mt-3 flex flex-wrap gap-2 text-sm">
          {([0, 1, 2] as const).map((w) => (
            <Link
              key={w}
              href={`/review/calendar?week=${w}`}
              className={`rounded-full border px-3 py-1.5 ${week === w ? "border-rf-ink bg-rf-ink text-rf-white" : "border-rf-hairline hover:bg-rf-white"}`}
            >
              Week {w}
            </Link>
          ))}
        </nav>
      </div>

      {resources.length === 0 ? (
        <p className="rounded-[20px] border border-rf-hairline bg-rf-white p-6 text-rf-slate">
          No held groups this week — nothing on the calendar.
        </p>
      ) : (
        <HoldCalendar resources={resources} events={events} />
      )}

      <p className="text-xs text-rf-slate">
        Simulated: hold expiry uses signup time + 7 days as an age proxy, same as the review queue — see its own note on the live timestamp field still pending.
      </p>
    </main>
  );
}
