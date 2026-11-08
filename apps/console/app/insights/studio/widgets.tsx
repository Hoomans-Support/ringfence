"use client";

// Insights' one custom AG Studio widget (FR-17), Ring Watch: the only thing on the page Studio's
// built-in widgets can't do, a live poll of the real API. The KPIs, charts, tables and filters are
// Studio's own, fed by the payouts data source (insights.tsx). Ring Watch doesn't query that data
// engine; its definition's `options` field (ag-studio's own documented channel for "data passed
// directly to the widget", not Studio's field-mapping system) carries the ring to watch straight
// from the page's props, rebuilt fresh on every render — simpler and more certain than relying on
// React context surviving whatever internal portal Studio uses to mount a custom `comp`.
import type { AgDefaultWidgetDefinition, AgWidgetApi, AgWidgetFormParams, AgWidgetParams } from "ag-studio";
import { createWidgets, type AgRegistry, type AgWidgetDefinition } from "ag-studio-react";
import { useEffect, useState, type ReactNode } from "react";

// Studio waits for each widget to report its own display state before it considers the page
// rendered (confirmed by instrumenting onRenderStateChanged: it sat on "loading" forever until
// this was added) — Ring Watch doesn't query Studio's data engine, so nothing else would ever
// call `setDisplayState` for it.
function useDisplayedOnMount(widgetApi: AgWidgetApi) {
  useEffect(() => {
    widgetApi.setDisplayState("displayed");
  }, [widgetApi]);
}

// --- Options: what Ring Watch receives, built fresh per render from the page's props ---

export interface RingWatchOptions {
  runId: string;
  /** The run's name as the console shows it ("Week 45"). */
  runName: string;
  ringId: string;
  thresholdUsd: number;
  keptUsd: number;
  leakedUsd: number;
  memberAmounts: Record<string, number>;
  enabled: boolean;
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
// The name the rest of the console uses: ring R-12 is "Group 12". The id itself stays as it is
// underneath (Ring Watch asks the API for "R-12").
const groupName = (ringLabel: string) => ringLabel.replace(/^R-(\d+)/, "Group $1");

// --- Components: plain cards in the app's own voice, not a generic chart/gauge look ---

// AG Studio's own root canvas sets font-size:14px/line-height:16px, inherited by everything
// mounted inside it; a Tailwind arbitrary size like `text-[Npx]` only sets font-size, never
// line-height, so any custom text here that doesn't set its own `leading-*` silently keeps
// that inherited 16px regardless of its own size - fine at 13-15px, but a 32-40px number then
// overflows its own line box into the text above it. Every custom size below sets its own.
function WidgetHeading({ children }: { children: ReactNode }) {
  // Sized like Studio's own widget titles (studio/theme.ts: 20px, 600), so it reads as one of them.
  return <h3 className="text-[20px] font-semibold tracking-[-0.01em] leading-[1.3] text-rf-ink">{children}</h3>;
}

function RingWatchWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RingWatchOptions;
  const [latest, setLatest] = useState<{ states: { sender_item_id: string; state: string }[] }>();
  const [status, setStatus] = useState(o.enabled ? "Connecting to the live API…" : "Live API is not configured.");
  const keptUsd = latest ? latest.states.filter((member) => member.state === "held" || member.state === "blocked").reduce((sum, member) => sum + (o.memberAmounts[member.sender_item_id] ?? 0), 0) : o.keptUsd;
  const leakedUsd = latest ? latest.states.filter((member) => member.state !== "held" && member.state !== "blocked").reduce((sum, member) => sum + (o.memberAmounts[member.sender_item_id] ?? 0), 0) : o.leakedUsd;
  const totalUsd = keptUsd + leakedUsd;
  const crossed = totalUsd >= o.thresholdUsd;

  useEffect(() => {
    if (!o.enabled) return;
    let disposed = false;
    const poll = async () => {
      try {
        const query = new URLSearchParams({ run_id: o.runId, ring_id: o.ringId });
        const response = await fetch(`/api/ring-watch?${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 404 ? "Ring not found in the live run." : "Live API is unavailable.");
        const data = await response.json() as { members?: { sender_item_id: string; state: string }[] };
        if (!disposed) {
          setLatest({ states: data.members ?? [] });
          setStatus("Updated from the live API just now.");
        }
      } catch (error) {
        if (!disposed) setStatus(error instanceof Error ? error.message : "Live API is unavailable.");
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 8000);
    return () => { disposed = true; clearInterval(timer); };
  }, [o.enabled, o.runId, o.ringId]);

  const members = Object.keys(o.memberAmounts);
  if (!members.length) return <div className="flex h-full flex-col gap-2 p-4">
    <WidgetHeading>Ring Watch</WidgetHeading>
    <p className="text-sm leading-[1.5] text-rf-slate">Nothing to watch yet: Ringfence hasn&apos;t found a ring in any payout run so far. Once it does, this card follows that ring&apos;s payouts live on the real API.</p>
  </div>;

  const stateOf = new Map(latest?.states.map((m) => [m.sender_item_id, m.state]));
  const isKept = (s?: string) => s === "held" || s === "blocked";
  const isPaid = (s?: string) => s === "sent" || s === "succeeded";
  const stateSummary = latest ? `${latest.states.filter((member) => member.state === "held").length} held · ${latest.states.filter((member) => member.state === "blocked").length} blocked · ${latest.states.filter((member) => isPaid(member.state)).length} paid` : "Waiting for first poll";
  return <div className="flex h-full flex-col gap-3 p-4">
    <div>
      <WidgetHeading>Ring Watch</WidgetHeading>
      <p className="text-sm leading-[1.5] text-rf-slate">Live from the Ringfence API: {groupName(o.ringId)}&apos;s {members.length} payouts in {o.runName}&apos;s run, re-checked every 8 seconds.</p>
    </div>
    <p className={`font-mono text-[30px] font-semibold leading-[1.1] ${crossed ? "text-rf-spark-text" : "text-rf-ink"}`}>{money(totalUsd)}</p>
    <p className="text-sm leading-[1.5] text-rf-slate">Kept {money(keptUsd)} · leaked {money(leakedUsd)}. {crossed ? "Above" : "Below"} the {money(o.thresholdUsd)} alert threshold.</p>
    {/* One dot per payout in the ring, as the API last reported it: ink kept back, coral paid out. */}
    <div className="flex flex-wrap gap-1.5" aria-label={stateSummary}>
      {members.map((id) => {
        const s = stateOf.get(id);
        return <span key={id} title={`${id}: ${s ?? "waiting"}`} className={`size-4 rounded-full ${isKept(s) ? "bg-rf-ink" : isPaid(s) ? "bg-rf-spark" : s ? "bg-rf-star-grey" : "border border-rf-hairline"}`} />;
      })}
    </div>
    <p className="text-sm leading-[1.5] text-rf-ink">{stateSummary}</p>
    <p className="mt-auto text-xs leading-[1.5] text-rf-slate">{status}</p>
  </div>;
}

// --- Definition: minimal `form` (no data-mapping UI — Ring Watch takes no fields, only options) ---

const noMappingForm = (params: AgWidgetFormParams) => params.createDefaults({});

const ringWatchWidgetDefinition: AgWidgetDefinition<"ringWatch", any, any, RingWatchOptions> = {
  id: "ringWatch", label: "Ring Watch", form: noMappingForm, comp: RingWatchWidget,
  defaultSize: { width: 320, height: 220 }, minSize: { width: 220, height: 160 },
};

export interface InsightsRegistry extends AgRegistry {
  widgets: readonly (AgDefaultWidgetDefinition | typeof ringWatchWidgetDefinition)[];
}

export const insightsWidgets = createWidgets<InsightsRegistry>({
  additionalTypes: [ringWatchWidgetDefinition],
  // Edit mode's widget menu: ours first, then AG Studio's own built-in widgets, all usable over the
  // same data sources (listing the menu replaces Studio's default one, so the built-ins are named here).
  menu: [
    { label: "Ringfence", widgetIds: ["ringWatch"] },
    { label: "Numbers", widgetIds: ["value", "radial-gauge", "linear-gauge"] },
    { label: "Charts", widgetIds: ["column-chart-grouped", "column-chart-stacked", "bar-chart-grouped", "line-chart", "area-chart", "donut-chart", "pie-chart", "funnel-chart", "treemap-chart", "sunburst-chart", "scatter-chart"] },
    { label: "Tables", widgetIds: ["grid", "pivot-grid"] },
    { label: "Filters", widgetIds: ["button-filter", "list-filter", "date-filter"] },
    { label: "Content", widgetIds: ["text", "image"], collapsed: true },
  ],
});
