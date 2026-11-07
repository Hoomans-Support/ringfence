"use client";

// The control tower: an AG Studio dashboard over real data. Three data sources (this week's payouts,
// its paused accounts, and every payout run so far) feed Studio's own data engine, so the KPI tiles,
// donut, column chart, group filter and paused-accounts grid are Studio's built-in widgets querying
// and cross-filtering real rows. Three custom widgets cover what no built-in widget can (the ring
// diagram, the live Ring Watch poll, the analyst's read). "Edit dashboard" switches Studio into its
// edit mode, where anyone can move, resize, restyle or add widgets over the same data, or ask AG
// Studio's AI assistant to (studio/ai.ts, when OPENROUTER_API_KEY is set on the server).
//
// AG Studio depends on the browser (it measures its own canvas), so the real <AgStudio> only renders
// once this has mounted on the client; the server/first paint shows a plain skeleton instead.
import { useMemo, useState, useSyncExternalStore } from "react";
import { AgStudioAiModule, createAiHarness, type AgDataSourcesDefinition, type AgReportState } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { PayoutRow, RunHistoryRow } from "@/lib/control-tower-data";
import type { AnalystOptions, ControlTowerRegistry, RingGraphOptions, RingWatchOptions } from "./studio/widgets";
import { controlTowerWidgets } from "./studio/widgets";
import { promptStarters, studioAiAdapter } from "./studio/ai";
import { ringfenceStudioTheme } from "./studio/theme";

export interface ControlTowerData {
  licenseKey?: string;
  /** The server has an AI model configured, so edit mode gets the AI Assistant panel. */
  aiEnabled: boolean;
  ringGraph: RingGraphOptions;
  ringWatch: RingWatchOptions;
  analyst: AnalystOptions;
  sources: { payouts: PayoutRow[]; holds: PayoutRow[]; history: RunHistoryRow[] };
}

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({ xTrack, yTrack, xSpan, ySpan });
const usdFormat = { format: "$#,##0" };
const title = (text: string) => ({ title: { enabled: true, text } });
// A KPI tile: its title, and the number big and bold, coral when it counts a pause.
const kpi = (text: string, alert = false) => ({
  ...title(text),
  style: { typography: { fontSize: 36, fontWeight: "bold" as const }, color: alert ? "var(--rf-spark-text)" : "var(--rf-ink)", verticalAlign: "center" as const },
});

const noSubscription = () => () => {};

export function ControlTower(data: ControlTowerData) {
  const inBrowser = useSyncExternalStore(noSubscription, () => true, () => false);
  return inBrowser ? <ReadyControlTower {...data} /> : <ControlTowerSkeleton />;
}

function ControlTowerSkeleton() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 p-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
      <div className="grid grid-rows-3 gap-4">
        <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
        <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
        <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
      </div>
    </div>
  );
}

function ReadyControlTower({ licenseKey, aiEnabled, ringGraph, ringWatch, analyst, sources }: ControlTowerData) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  // Bumped by "Reset layout": a fresh mount throws away whatever was changed in edit mode.
  const [resets, setResets] = useState(0);

  // Each custom widget's `options` is how it receives this run's numbers (studio/widgets.tsx).
  const widgets = useMemo(() => ({
    ...controlTowerWidgets,
    widgets: controlTowerWidgets.widgets.map((w) =>
      w.id === "ringGraph" ? { ...w, options: ringGraph } : w.id === "ringWatch" ? { ...w, options: ringWatch } : w.id === "analyst" ? { ...w, options: analyst } : w),
  }), [ringGraph, ringWatch, analyst]);

  const data = useMemo((): AgDataSourcesDefinition<ControlTowerRegistry> => {
    const text = (id: string, name: string) => ({ id, name, format: "textFormat" as const });
    const int = (id: string, name: string) => ({ id, name, format: "integerFormat" as const });
    const usd = (id: string, name: string) => ({ id, name, format: "currencyFormat" as const, formatOptions: usdFormat });
    const payoutFields = [
      text("run", "Payout run"), text("status", "Status"), text("group", "Group"), text("account", "Account"),
      text("payout", "Payout linked to"), text("device", "Device"), usd("amount", "Amount"),
      int("paid", "Paid on time"), int("paused", "Paused"), int("mistaken", "Real people paused"), int("count", "Payees"),
      usd("kept", "Kept from fraud"), usd("leaked", "Leaked to fraud"),
    ];
    return {
      sources: [
        { id: "payouts", name: "This run's payouts", data: sources.payouts as unknown as Record<string, string | number>[], fields: payoutFields },
        { id: "holds", name: "Paused accounts", data: sources.holds as unknown as Record<string, string | number>[], fields: payoutFields },
        { id: "history", name: "Payout runs", data: sources.history as unknown as Record<string, string | number>[], fields: [text("run", "Payout run"), int("order", "Week"), usd("kept", "Kept from fraud"), usd("leaked", "Leaked to fraud")] },
      ],
    };
  }, [sources]);

  const initialState = useMemo(
    (): AgReportState<ControlTowerRegistry> => ({
      selectedPageId: "control-tower",
      pages: [
        {
          id: "control-tower",
          widgets: {
            kpiPaid: { type: "value", dataMapping: { value: [{ id: "payouts.paid", aggregation: "sum" }] }, format: kpi("Paid on time") },
            kpiPaused: { type: "value", dataMapping: { value: [{ id: "payouts.paused", aggregation: "sum" }] }, format: kpi("Paused", true) },
            kpiKept: { type: "value", dataMapping: { value: [{ id: "payouts.kept", aggregation: "sum" }] }, format: kpi("Kept from fraud") },
            kpiMistaken: { type: "value", dataMapping: { value: [{ id: "payouts.mistaken", aggregation: "sum" }] }, format: kpi("Real people paused", true) },
            ringGraph: { type: "ringGraph", dataMapping: {} },
            split: {
              type: "donut-chart",
              dataMapping: { categoryKey: [{ id: "payouts.status" }], valueKey: [{ id: "payouts.count", aggregation: "sum" }] },
              // Alphabetical puts "Paid on time" first (ink), then the two kinds of pause (coral, grey).
              sort: [{ field: { id: "payouts.status" }, direction: "asc" }],
              format: title("Where this run's payees went"),
            },
            runs: {
              type: "column-chart-grouped",
              // Kept first (ink), leaked second (coral), the theme's palette order.
              dataMapping: { categoryKey: [{ id: "history.run" }], valueKey: [{ id: "history.kept", aggregation: "sum" }, { id: "history.leaked", aggregation: "sum" }] },
              sort: [{ field: { id: "history.order", aggregation: "min" }, direction: "asc" }],
              format: { ...title("Kept vs leaked, by payout run"), style: { theme: { common: { legend: { enabled: true, position: "bottom" } } } } },
            },
            ringWatch: { type: "ringWatch", dataMapping: {} },
            analyst: { type: "analyst", dataMapping: {} },
            // No title of its own: the filter labels itself ("Filter by: Group") and needs the room for its buttons.
            groupFilter: { type: "button-filter", dataMapping: { value: [{ id: "holds.group" }] } },
            pausedGrid: {
              type: "grid",
              dataMapping: { cols: ["group", "account", "payout", "device", "status", "amount"].map((f) => ({ id: `holds.${f}` })) },
              format: title("Paused accounts"),
            },
          },
          widgetLayout: {
            kpiPaid: at(0, 0, 6, 8),
            kpiPaused: at(6, 0, 6, 8),
            kpiKept: at(12, 0, 6, 8),
            kpiMistaken: at(18, 0, 6, 8),
            ringGraph: at(0, 8, 14, 56),
            split: at(14, 8, 10, 20),
            runs: at(14, 28, 10, 20),
            ringWatch: at(14, 48, 10, 16),
            analyst: at(0, 64, 24, 8),
            groupFilter: at(0, 72, 24, 8),
            pausedGrid: at(0, 80, 24, 24),
          },
        },
      ],
    }),
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-2">
        {mode === "edit" && (
          <span className="mr-auto text-sm text-rf-slate">Editing: drag, resize or restyle any widget, add one over the same data from the panels{aiEnabled ? ", or ask the AI assistant" : ""}.</span>
        )}
        {mode === "edit" && (
          <button type="button" onClick={() => { setResets((n) => n + 1); setMode("view"); }} className="min-h-9 rounded-full border border-rf-hairline px-4 text-sm hover:bg-rf-mist">Reset layout</button>
        )}
        <button type="button" onClick={() => setMode(mode === "view" ? "edit" : "view")}
          className={`min-h-9 rounded-full border border-rf-ink px-4 text-sm font-medium ${mode === "edit" ? "bg-rf-ink text-rf-white" : "bg-rf-white text-rf-ink hover:bg-rf-mist"}`}>
          {mode === "edit" ? "Done editing" : "Edit dashboard"}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <AgStudioProvider licenseKey={licenseKey} modules={aiEnabled ? [AgStudioAiModule] : []}>
          <AgStudio<ControlTowerRegistry>
            key={resets}
            style={{ height: "100%", width: "100%" }}
            theme={ringfenceStudioTheme}
            widgets={widgets}
            data={data}
            initialState={initialState}
            mode={mode}
            // Edit mode opens Studio's own panels: the widget editor and the data fields to build from.
            panels={{ view: {}, edit: { left: ["data"], right: aiEnabled ? ["edit", "ai"] : ["edit"] } }}
            ai={aiEnabled ? (params) => createAiHarness(params.api, { adapter: studioAiAdapter, promptStarters }) : undefined}
            onErrorRaised={(e) => console.error("[control tower] AG Studio error:", e)}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}
