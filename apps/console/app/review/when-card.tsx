"use client";

// "When": sign-ups per day around the case, then a zoomed-in view drawn by Bryntum Scheduler (the
// sponsor timeline) — one row, each account a dot at its sign-up minute, Bryntum's own "stack"
// layout piling up dots that share a minute into the designer's dot plot — and the case's milestones.
// Every time is UTC+7, the team's time zone, like the rest of the console.
import { useEffect, useRef, useState } from "react";
import type { DemoCase } from "../demo-store";

type SchedulerInstance = { destroy: () => void };
const TZ = "Asia/Jakarta";
const DAY = 86_400_000;
const jakartaDay = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
const dayLabel = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).replace(",", "");
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function DotPlot({ c, start, end, unit }: { c: DemoCase; start: number; end: number; unit: "minute" | "hour" | "day" }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let scheduler: SchedulerInstance | undefined;
    const url = "/api/vendor/bryntum";
    void import(/* webpackIgnore: true */ url).then(({ Scheduler }: { Scheduler: new (config: Record<string, unknown>) => SchedulerInstance }) => {
      if (disposed || !host.current) return;
      // The tick defines how Bryntum rounds the time range, so it must match the axis drawn below,
      // even though Bryntum's own header is hidden.
      const tick = unit === "minute" ? { unit: "minute", increment: 5 } : unit === "hour" ? { unit: "hour", increment: 1 } : { unit: "day", increment: 1 };
      scheduler = new Scheduler({
        appendTo: host.current,
        cls: "rf-dotplot",
        autoHeight: true,
        readOnly: true,
        // forceFit stretches start..end across the full width, so the axis drawn below lines up exactly.
        forceFit: true,
        hideHeaders: true,
        timeZone: TZ,
        startDate: new Date(start),
        endDate: new Date(end),
        viewPreset: { base: unit === "day" ? "dayAndWeek" : "minuteAndHour", tickWidth: 40, timeResolution: { unit: "minute", increment: 1 }, headers: [{ ...tick, dateFormat: "HH:mm" }] },
        columns: [],
        rowHeight: 16,
        barMargin: 2,
        eventLayout: "stack",
        zoomOnMouseWheel: false,
        zoomOnTimeAxisDoubleClick: false,
        resources: [{ id: "case", name: c.name ?? c.title }],
        // Each dot starts on its whole minute, so sign-ups in the same minute stack into one column.
        events: c.members.map((m) => ({ id: m.itemId, resourceId: "case", name: m.accountId, startDate: new Date(Math.floor(Date.parse(m.signupAt) / 60_000) * 60_000), duration: unit === "day" ? 60 : 1, durationUnit: "minute" })),
        eventRenderer: () => "",
        features: {
          eventTooltip: { template: ({ eventRecord }: { eventRecord: { name: string; startDate: Date } }) => `${eventRecord.name} · ${hhmm(eventRecord.startDate.getTime())}` },
          columnLines: false, eventDrag: false, eventResize: false, eventEdit: false, eventMenu: false, scheduleMenu: false,
          scheduleTooltip: false, timeAxisHeaderMenu: false, cellMenu: false, headerMenu: false, sort: false,
        },
      });
    }, () => setFailed(true));
    return () => { disposed = true; scheduler?.destroy(); };
  }, [c, start, end, unit]);
  if (failed) return <p className="text-sm text-rf-slate">The Bryntum timeline couldn&apos;t load.</p>;
  // The designer's axis under the dots: a baseline with a tick and a time at every step.
  const step = unit === "minute" ? 5 * 60_000 : unit === "hour" ? 3_600_000 : DAY;
  const ticks = Array.from({ length: Math.round((end - start) / step) + 1 }, (_, i) => start + i * step);
  return (
    <div className="px-3">
      <div ref={host} aria-label={`Each of the ${c.members.length} accounts as a dot at its sign-up time`} />
      <div className="relative h-7 border-t border-rf-ink">
        {ticks.map((t) => (
          <div key={t} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${((t - start) / (end - start)) * 100}%` }}>
            <span className="h-1.5 w-px bg-rf-ink" />
            <span className="mt-1 font-mono text-[11px] text-rf-slate">{unit === "day" ? dayLabel(t) : hhmm(t)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhenCard({ c, today, runName, signupsByDay, decided }: { c: DemoCase; today: string; runName: string; signupsByDay: Record<string, number>; decided: boolean }) {
  const times = c.members.map((m) => Date.parse(m.signupAt)).sort((a, b) => a - b);
  const first = times[0]!;
  const last = times.at(-1)!;
  const spanMin = Math.round((last - first) / 60_000);
  const n = c.members.length;
  const name = c.name ?? "this group";

  // Eight days ending today, unless the group signed up before that window; then end 3 days after it.
  const todayMs = Date.parse(today);
  const endMs = first >= todayMs - 7 * DAY ? todayMs : Date.parse(jakartaDay(last)) + 3 * DAY;
  const days = Array.from({ length: 8 }, (_, i) => endMs - (7 - i) * DAY);
  const mineByDay = new Map<string, number>();
  for (const t of times) mineByDay.set(jakartaDay(t), (mineByDay.get(jakartaDay(t)) ?? 0) + 1);
  const max = Math.max(1, ...days.map((d) => signupsByDay[jakartaDay(d)] ?? 0));
  const peak = days.find((d) => mineByDay.has(jakartaDay(d)));

  // The zoomed window: 5-minute ticks for a burst, hours for a few hours, days beyond that.
  const unit = spanMin <= 45 ? "minute" : spanMin <= 8 * 60 ? "hour" : "day";
  const step = unit === "minute" ? 5 * 60_000 : unit === "hour" ? 3_600_000 : DAY;
  const zStart = Math.floor(first / step) * step;
  const zEnd = Math.max(Math.ceil((last + 1) / step) * step, zStart + (unit === "minute" ? 15 * 60_000 : 2 * step));

  const dueMs = Date.parse(c.dueAt!);
  const milestones = [
    { time: `${dayLabel(first)} · ${hhmm(first)}`, text: "First account signs up" },
    { time: `${dayLabel(last)} · ${hhmm(last)}`, text: n === 2 ? "Second account signs up" : "Last account signs up" },
    { time: `${runName} run`, text: `${n} payouts paused, ${usd(c.usd)}` },
    { time: `${dayLabel(dueMs)} · ${hhmm(dueMs)}`, text: decided ? "Decided before the 7-day limit" : "Decide by: 7 days after sign-up. If no one decides, the payout stays paused" },
  ];

  return (
    <div className="flex flex-col gap-6 rounded-[20px] border border-rf-hairline p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em]">When</h3>
        <span className="text-[15px] leading-[1.45] text-rf-slate">
          {n === 2 ? `Signed up ${Math.round(spanMin / 60)} hours apart. Not a burst.` : spanMin < 120 ? `A normal busy day, with ${name} arriving in one ${spanMin}-minute burst inside it.` : `${n} sign-ups spread over ${Math.round(spanMin / 60)} hours.`}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium">Sign-ups per day, all members</span>
          <span className="flex gap-4 text-xs text-rf-slate">
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-xs bg-rf-hairline" />Other members</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-xs bg-rf-ink" />{c.name ?? "This group"}</span>
          </span>
        </div>
        <div role="img" aria-label={`Sign-ups per day from ${dayLabel(days[0]!)} to ${dayLabel(days[7]!)}${peak ? `; ${mineByDay.get(jakartaDay(peak))} of ${signupsByDay[jakartaDay(peak)] ?? 0} on ${dayLabel(peak)} were ${name}` : ""}.`}
          className="grid grid-cols-8 items-end gap-2">
          {days.map((d) => {
            const key = jakartaDay(d);
            const total = signupsByDay[key] ?? 0;
            const mine = mineByDay.get(key) ?? 0;
            const strong = mine > 0;
            return (
              <div key={key} className="flex flex-col items-stretch gap-2">
                <span className={`text-center font-mono text-[11px] ${strong ? "text-rf-ink" : "text-rf-slate"}`}>{total}</span>
                <div className="flex h-30 flex-col justify-end">
                  <div className="rounded-t-md bg-rf-hairline" style={{ height: `${Math.round(((total - mine) / max) * 112)}px` }} />
                  <div className="bg-rf-ink" style={{ height: `${Math.round((mine / max) * 112)}px` }} />
                </div>
                <span className={`text-center font-mono text-[11px] tracking-[0.04em] ${strong ? "text-rf-ink" : "text-rf-slate"}`}>
                  {new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: TZ }).toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium">
            Zoomed in: {unit === "day" ? `${dayLabel(zStart)} to ${dayLabel(zEnd)}` : `${dayLabel(zStart)}, ${hhmm(zStart)} to ${hhmm(zEnd)}`}{unit === "minute" ? " · each dot is one account" : " · each dot is one account's sign-up"}
          </span>
          <span className="font-mono text-[11px] tracking-[0.08em] text-rf-slate">BRYNTUM SCHEDULER</span>
        </div>
        <DotPlot c={c} start={zStart} end={zEnd} unit={unit} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {milestones.map((m, i) => {
          const dark = i === milestones.length - 1;
          return (
            <div key={m.time} className={`flex flex-col gap-1 rounded-[14px] p-4 ${dark ? "bg-rf-ink text-rf-white" : "bg-rf-mist text-rf-ink"}`}>
              <span className="font-mono text-xs">{m.time}</span>
              <span className="text-sm leading-[1.4]">{m.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
