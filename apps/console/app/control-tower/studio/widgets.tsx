"use client";

// The control tower's custom AG Studio widgets (FR-17): only what Studio's built-in widgets can't do
// (a network diagram, a live API poll, the analyst's prose). The KPIs, charts, grid and filter are
// Studio's own, fed by real data sources (control-tower.tsx). These three don't query that data
// engine: what they show is already computed server-side (the case's accounts, the analyst's
// read, the ring Ring Watch polls), so there is nothing to aggregate. Instead, each definition's `options` field
// (ag-studio's own documented channel for "data passed directly to the widget", not Studio's
// field-mapping system) carries the precomputed value straight from the control tower page's props,
// rebuilt fresh on every render — simpler and more certain than relying on React context surviving
// whatever internal portal Studio uses to mount a custom `comp`.
import type { AgDefaultWidgetDefinition, AgWidgetApi, AgWidgetFormParams, AgWidgetParams } from "ag-studio";
import { createWidgets, type AgRegistry, type AgWidgetDefinition } from "ag-studio-react";
import { useEffect, useState, type ReactNode } from "react";
import type { DemoMember } from "../../demo-store";
import { legendFor, RingDiagram } from "../../review/linked-card";

// Studio waits for each widget to report its own display state before it considers the page
// rendered (confirmed by instrumenting onRenderStateChanged: it sat on "loading" forever until
// this was added) — none of our widgets query Studio's data engine, so nothing else would ever
// call `setDisplayState` for them.
function useDisplayedOnMount(widgetApi: AgWidgetApi) {
  useEffect(() => {
    widgetApi.setDisplayState("displayed");
  }, [widgetApi]);
}

// --- Options: what each widget receives, built fresh per render from the control tower's props ---

/** The week's main paused group, drawn the way Decisions draws it (RingDiagram). */
export interface RingGraphOptions {
  name: string;
  caption: string;
  members: DemoMember[];
}

export interface RingWatchOptions {
  runId: string;
  ringId: string;
  thresholdUsd: number;
  keptUsd: number;
  leakedUsd: number;
  memberAmounts: Record<string, number>;
  enabled: boolean;
}

export interface AnalystOptions { note: string }

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
  return <h3 className="text-[16px] font-semibold tracking-[-0.02em] leading-[1.3] text-rf-ink">{children}</h3>;
}

function RingGraphWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RingGraphOptions;
  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div>
        <WidgetHeading>Ring graph</WidgetHeading>
        <p className="text-sm text-rf-slate">
          <span className="font-medium text-rf-ink">{o.name}</span>{o.members.length ? ` · ${o.caption}` : ""}
        </p>
      </div>
      {o.members.length ? (
        <>
          <RingDiagram members={o.members} label={o.name} status={() => "Paused"} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rf-slate">
            {legendFor(o.members, o.name).map((l) => (
              <span key={l.text} className="flex items-center gap-1.5"><span className={`flex-none ${l.look}`} />{l.text}</span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-rf-slate">Nothing paused this week, so there is no group to draw.</p>
      )}
    </div>
  );
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

  const stateSummary = latest ? `${latest.states.filter((member) => member.state === "held").length} held · ${latest.states.filter((member) => member.state === "blocked").length} blocked · ${latest.states.filter((member) => member.state === "sent" || member.state === "succeeded").length} paid` : "Waiting for first poll";
  return <div className="flex h-full flex-col gap-2 p-5">
    <WidgetHeading>Ring Watch</WidgetHeading>
    <p className={`font-mono text-[30px] font-semibold leading-[1.1] ${crossed ? "text-rf-spark-text" : "text-rf-ink"}`}>{money(totalUsd)}</p>
    <p className="text-sm text-rf-slate">Kept {money(keptUsd)} · leaked {money(leakedUsd)}. {crossed ? "Above" : "Below"} the {money(o.thresholdUsd)} threshold for {groupName(o.ringId)}.</p>
    <p className="text-sm text-rf-ink">{stateSummary}</p>
    <p className="text-xs text-rf-slate">{status} · polling every 8 seconds</p>
  </div>;
}

function AnalystWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as AnalystOptions;
  return <div className="flex h-full flex-col gap-2 p-5"><WidgetHeading>Analyst read</WidgetHeading><p className="text-sm leading-[1.5] text-rf-slate">{o.note}</p></div>;
}

// --- Definitions: minimal `form` (no data-mapping UI — these widgets take no fields, only options) ---

const noMappingForm = (params: AgWidgetFormParams) => params.createDefaults({});

const ringGraphWidgetDefinition: AgWidgetDefinition<"ringGraph", any, any, RingGraphOptions> = {
  id: "ringGraph",
  label: "Ring graph",
  form: noMappingForm,
  comp: RingGraphWidget,
  defaultSize: { width: 520, height: 440 },
  minSize: { width: 320, height: 280 },
};

const ringWatchWidgetDefinition: AgWidgetDefinition<"ringWatch", any, any, RingWatchOptions> = {
  id: "ringWatch", label: "Ring Watch", form: noMappingForm, comp: RingWatchWidget,
  defaultSize: { width: 320, height: 220 }, minSize: { width: 220, height: 160 },
};

const analystWidgetDefinition: AgWidgetDefinition<"analyst", any, any, AnalystOptions> = {
  id: "analyst", label: "Analyst read", form: noMappingForm, comp: AnalystWidget,
  defaultSize: { width: 320, height: 220 }, minSize: { width: 220, height: 160 },
};

export interface ControlTowerRegistry extends AgRegistry {
  widgets: readonly (
    | AgDefaultWidgetDefinition
    | typeof ringGraphWidgetDefinition
    | typeof ringWatchWidgetDefinition
    | typeof analystWidgetDefinition
  )[];
}

export const controlTowerWidgets = createWidgets<ControlTowerRegistry>({
  additionalTypes: [ringGraphWidgetDefinition, ringWatchWidgetDefinition, analystWidgetDefinition],
  // Edit mode's widget menu: ours first, then AG Studio's own built-in widgets, all usable over the
  // same data sources (listing the menu replaces Studio's default one, so the built-ins are named here).
  menu: [
    { label: "Ringfence", widgetIds: ["ringGraph", "ringWatch", "analyst"] },
    { label: "Numbers", widgetIds: ["value", "radial-gauge", "linear-gauge"] },
    { label: "Charts", widgetIds: ["column-chart-grouped", "column-chart-stacked", "bar-chart-grouped", "line-chart", "area-chart", "donut-chart", "pie-chart", "funnel-chart", "treemap-chart", "sunburst-chart", "scatter-chart"] },
    { label: "Tables", widgetIds: ["grid", "pivot-grid"] },
    { label: "Filters", widgetIds: ["button-filter", "list-filter", "date-filter"] },
    { label: "Content", widgetIds: ["text", "image"], collapsed: true },
  ],
});
