"use client";

// The hold calendar, drawn by Bryntum Scheduler: one row per paused group, a bar from its first
// sign-up to its 7-day hold limit, fitted to the width so every deadline is in view at once, with
// the demo's own "today" marked. Bars past their limit on that day take the overdue style.
import { useEffect, useRef } from "react";

type Resource = { id: string; name: string };
type CalendarEvent = { id: string; resourceId: string; name: string; startDate: string; endDate: string };
type BryntumSchedulerInstance = { destroy: () => void };
const DAY = 86_400_000;

export function HoldCalendar({ resources, events, today }: { resources: Resource[]; events: CalendarEvent[]; today: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let scheduler: BryntumSchedulerInstance | undefined;
    const todayMs = Date.parse(today);
    // From the day before the first sign-up to the day after the last deadline (or today, if later).
    const start = Math.floor(Math.min(...events.map((e) => Date.parse(e.startDate))) / DAY) * DAY - DAY;
    const end = Math.ceil(Math.max(todayMs, ...events.map((e) => Date.parse(e.endDate))) / DAY) * DAY + DAY;

    const schedulerUrl = "/api/vendor/bryntum";
    void import(/* webpackIgnore: true */ schedulerUrl).then(({ Scheduler }: { Scheduler: new (config: Record<string, unknown>) => BryntumSchedulerInstance }) => {
      if (disposed || !hostRef.current) return;
      scheduler = new Scheduler({
        appendTo: hostRef.current,
        autoHeight: true,
        readOnly: true,
        forceFit: true,
        rowHeight: 48,
        barMargin: 10,
        timeZone: "Asia/Jakarta",
        startDate: new Date(start),
        endDate: new Date(end),
        viewPreset: { base: "weekAndDay", headers: [{ unit: "day", dateFormat: "ddd D" }] },
        columns: [{ text: "Paused group", field: "name", width: 190 }],
        resources,
        events: events.map((e) => ({ ...e, cls: Date.parse(e.endDate) < todayMs ? "rf-overdue-event" : undefined, startDate: new Date(e.startDate), endDate: new Date(e.endDate) })),
        timeRanges: [{ id: "today", startDate: new Date(todayMs), cls: "rf-today" }],
        zoomOnMouseWheel: false,
        zoomOnTimeAxisDoubleClick: false,
        features: { eventTooltip: true, timeRanges: { showHeaderElements: false }, eventMenu: false, scheduleMenu: false, cellMenu: false, headerMenu: false, timeAxisHeaderMenu: false },
      });
    }, () => undefined);

    return () => {
      disposed = true;
      scheduler?.destroy();
    };
  }, [events, resources, today]);

  return (
    <div className="overflow-hidden rounded-[20px] border border-rf-hairline bg-rf-white">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rf-hairline px-5 py-4">
        <span className="text-base font-semibold">{resources.length} paused group{resources.length === 1 ? "" : "s"}</span>
        <span className="flex items-center gap-4 text-[13px] text-rf-slate">
          <span className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-full bg-rf-spark" />Sign-up to 7-day limit</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-full bg-rf-spark-text outline-2 outline-offset-1 outline-rf-ink" />Past its limit</span>
          <span className="flex items-center gap-2"><span className="h-3 w-0.5 bg-rf-ink" />Today</span>
        </span>
      </div>
      <div ref={hostRef} className="ringfence-scheduler" aria-label="Calendar of hold limits" />
    </div>
  );
}
