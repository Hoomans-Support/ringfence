"use client";

import { useEffect, useRef } from "react";

type Resource = { id: string; name: string };
type CalendarEvent = { id: string; resourceId: string; name: string; startDate: string; endDate: string };
type BryntumSchedulerInstance = { destroy: () => void; scrollToDate: (date: Date) => void };

export function HoldCalendar({ resources, events }: { resources: Resource[]; events: CalendarEvent[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const schedulerRef = useRef<BryntumSchedulerInstance | null>(null);

  const earliestStart = events.reduce((min, e) => {
    const d = new Date(e.startDate);
    return d < min ? d : min;
  }, new Date(events[0]?.startDate ?? new Date().toISOString()));
  const latestEnd = events.reduce((max, e) => {
    const d = new Date(e.endDate);
    return d > max ? d : max;
  }, new Date(events[0]?.endDate ?? new Date().toISOString()));

  useEffect(() => {
    let disposed = false;
    let scheduler: BryntumSchedulerInstance | undefined;

    const schedulerUrl = "/api/vendor/bryntum";
    void import(/* webpackIgnore: true */ schedulerUrl).then(({ Scheduler }: {
      Scheduler: new (config: Record<string, unknown>) => BryntumSchedulerInstance;
    }) => {
      if (disposed || !hostRef.current) return;
      scheduler = new Scheduler({
        appendTo: hostRef.current,
        autoHeight: true,
        rowHeight: 32,
        barMargin: 4,
        startDate: earliestStart,
        endDate: latestEnd,
        viewPreset: "weekAndDay",
        columns: [{ text: "Held group", field: "name", width: 160 }],
        resources,
        events: events.map((e) => ({ ...e, startDate: new Date(e.startDate), endDate: new Date(e.endDate) })),
        features: { eventTooltip: true },
      });
      schedulerRef.current = scheduler;
      // weekAndDay snaps its visible range to the start of the containing calendar week, which can
      // be several empty days before the earliest real hold - scroll past them once rendered.
      // Immediately after construction the widget hasn't finished its own layout pass yet, so
      // scrollToDate silently no-ops there; a microtask-deferred call lands after that pass.
      setTimeout(() => scheduler?.scrollToDate(earliestStart), 0);
    });

    return () => {
      disposed = true;
      scheduler?.destroy();
      schedulerRef.current = null;
    };
  }, [events, resources, earliestStart, latestEnd]);

  return (
    <div className="overflow-hidden rounded-[20px] border border-rf-hairline bg-rf-white">
      <div className="flex items-center justify-between gap-4 border-b border-rf-hairline px-4 py-3">
        <p className="text-sm text-rf-slate">
          {resources.length} held group{resources.length === 1 ? "" : "s"} · each bar runs from sign-up to its 7-day hold expiry
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => schedulerRef.current?.scrollToDate(earliestStart)}
            className="rounded-full border border-rf-hairline px-3 py-1.5 text-sm hover:bg-rf-mist"
          >
            Jump to earliest hold
          </button>
          <button
            type="button"
            onClick={() => schedulerRef.current?.scrollToDate(latestEnd)}
            className="rounded-full bg-rf-ink px-3 py-1.5 text-sm text-white hover:opacity-85"
          >
            Jump to latest expiry
          </button>
        </div>
      </div>
      <div ref={hostRef} className="ringfence-scheduler" aria-label="Calendar of hold expiry dates" />
    </div>
  );
}
