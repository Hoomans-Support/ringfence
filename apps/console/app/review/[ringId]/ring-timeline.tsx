"use client";

import { useEffect, useRef } from "react";

type Resource = { id: string; name: string };
type TimelineEvent = {
  id: string;
  resourceId: string;
  name: string;
  startDate: string;
  endDate: string;
};
type BryntumSchedulerInstance = { destroy: () => void; scrollToDate: (date: Date) => void };

export function RingTimeline({ resources, events, payoutAt }: { resources: Resource[]; events: TimelineEvent[]; payoutAt: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const schedulerRef = useRef<BryntumSchedulerInstance | null>(null);
  const firstSignup = events.reduce((first, event) => {
    const date = new Date(event.startDate);
    return date < first ? date : first;
  }, new Date(events[0]?.startDate ?? "2026-10-30T00:00:00Z"));
  const payoutDate = new Date(payoutAt);

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
        height: 470,
        rowHeight: 18,
        barMargin: 2,
        startDate: firstSignup,
        endDate: payoutDate,
        viewPreset: "hourAndDay",
        columns: [{ text: "Payee", field: "name", width: 120 }],
        resources,
        events: events.map((event) => ({ ...event, startDate: new Date(event.startDate), endDate: new Date(event.endDate) })),
        features: { eventTooltip: false },
      });
      schedulerRef.current = scheduler;
    });

    return () => {
      disposed = true;
      scheduler?.destroy();
      schedulerRef.current = null;
    };
  }, [events, firstSignup, payoutAt, resources]);

  return (
    <div className="overflow-hidden rounded-[20px] border border-rf-hairline bg-rf-white">
      <div className="flex items-center justify-between gap-4 border-b border-rf-hairline px-4 py-3">
        <p className="text-sm text-rf-slate">Sign-up burst to payout · {events.length} payees</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => schedulerRef.current?.scrollToDate(firstSignup)}
            className="rounded-full border border-rf-hairline px-3 py-1.5 text-sm hover:bg-rf-mist"
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={() => schedulerRef.current?.scrollToDate(payoutDate)}
            className="rounded-full bg-rf-ink px-3 py-1.5 text-sm text-rf-white hover:opacity-85"
          >
            Step to payout
          </button>
        </div>
      </div>
      <div ref={hostRef} className="ringfence-scheduler min-h-[470px]" aria-label="Timeline of ring member sign-ups" />
    </div>
  );
}
