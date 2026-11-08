"use client";

// Insights: an AG Studio dashboard over every payout in every run so far (lib/insights-data.ts).
// One data source feeds Studio's own data engine, so the impact numbers, the "who stopped the fraud"
// chart, the pivot table, the paused-accounts grid and the two filters are Studio's built-in widgets
// querying and cross-filtering real rows. Ring Watch is the one custom widget: a live poll of the
// real API (studio/widgets.tsx). "Edit dashboard" switches Studio into its edit mode, where anyone
// can move, resize, restyle or add widgets over the same data; with OPENROUTER_API_KEY set on the
// server, the Ask bar puts a plain question to AG Studio's AI assistant (studio/ai.ts), which builds
// the answer as a new widget in front of you.
//
// AG Studio depends on the browser (it measures its own canvas), so the real <AgStudio> only renders
// once this has mounted on the client; the server/first paint shows a plain skeleton instead.
import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { AgStudioAiModule, createAiHarness, type AgAiChatSession, type AgAiHarness, type AgDataSourcesDefinition, type AgReportState, type AgStudioApi } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { InsightRow } from "@/lib/insights-data";
import { insightsWidgets, type InsightsRegistry, type RingWatchOptions } from "./studio/widgets";
import { promptStarters, studioAiAdapter } from "./studio/ai";
import { ringfenceStudioTheme } from "./studio/theme";

export interface InsightsData {
  licenseKey?: string;
  /** The server has an AI model configured: the Ask bar shows, and edit mode gets the AI Assistant panel. */
  aiEnabled: boolean;
  ringWatch: RingWatchOptions;
  rows: InsightRow[];
}

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text: string) => ({ title: { enabled: true, text } });
// A KPI tile: its title, and the number big and bold, coral when it counts something that went wrong.
const kpi = (text: string, alert = false) => ({
  ...title(text),
  style: { typography: { fontSize: 36, fontWeight: "bold" as const }, color: alert ? "var(--rf-spark-text)" : "var(--rf-ink)", verticalAlign: "center" as const },
});

const noSubscription = () => () => {};

export function Insights(data: InsightsData) {
  const inBrowser = useSyncExternalStore(noSubscription, () => true, () => false);
  return inBrowser ? <ReadyInsights {...data} /> : <InsightsSkeleton />;
}

function InsightsSkeleton() {
  return (
    <div className="grid h-full grid-rows-[8rem_1fr] gap-4 p-6">
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />)}
      </div>
      <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
    </div>
  );
}

function ReadyInsights({ licenseKey, aiEnabled, ringWatch, rows }: InsightsData) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  // Bumped by "Reset layout": a fresh mount throws away whatever was changed in edit mode.
  const [resets, setResets] = useState(0);
  const [question, setQuestion] = useState("");

  // One AI harness per mount, shared by the Ask bar and Studio's own assistant panel, so a question
  // asked here shows up (and keeps going) in that panel. Studio only builds its harness when the
  // panel first opens; building it here instead, from the API Studio hands over when it's ready,
  // lets the Ask bar start the conversation before edit mode is even on screen.
  const api = useRef<AgStudioApi | null>(null);
  const harness = useRef<AgAiHarness | null>(null);
  const session = useRef<AgAiChatSession | null>(null);
  const getHarness = (studioApi = api.current) =>
    harness.current ??= studioApi ? createAiHarness(studioApi, { adapter: studioAiAdapter, promptStarters }) : null;

  async function ask(text: string) {
    const h = getHarness();
    if (!text.trim() || !h) return;
    // The first question starts a thread, which the panel shows as soon as it opens (with no thread
    // of its own it picks the newest); later ones continue it.
    session.current ??= await h.createThread({ agentId: h.agents[0]?.id ?? "lead" });
    session.current.sendMessage(text.trim());
    setQuestion("");
    setMode("edit");
  }

  // A widget that appears (the assistant's answer, or one added from the panels) usually lands at
  // the bottom of the canvas, out of sight, so scroll Studio's canvas to it. New ones are spotted in
  // Studio's own state, which it reports on every change: the DOM can't tell, since widgets there
  // carry no id and off-screen ones aren't rendered at all.
  const canvas = useRef<HTMLDivElement>(null);
  const widgetIds = useRef<Set<string> | null>(null);
  function showNewWidget(state: AgReportState) {
    const page = state.pages?.find((p) => p.id === state.selectedPageId);
    const ids = Object.keys(page?.widgets ?? {});
    const before = widgetIds.current ?? new Set(Object.keys(initialState.pages?.[0]?.widgets ?? {}));
    const added = ids.find((id) => !before.has(id));
    widgetIds.current = new Set(ids);
    const row = added ? page?.widgetLayout?.[added]?.yTrack : undefined;
    // 16px rows (studio/theme.ts); a row of margin above keeps the card's top edge in view.
    if (row !== undefined) canvas.current?.querySelector(".ag-studio-layout")?.scrollTo({ top: Math.max(0, (row - 1) * 16), behavior: "smooth" });
  }

  const widgets = useMemo(() => ({
    ...insightsWidgets,
    // Ring Watch's `options` is how it receives this run's numbers (studio/widgets.tsx).
    widgets: insightsWidgets.widgets.map((w) => (w.id === "ringWatch" ? { ...w, options: ringWatch } : w)),
  }), [ringWatch]);

  const data = useMemo((): AgDataSourcesDefinition<InsightsRegistry> => {
    const text = (id: string, name: string) => ({ id, name, format: "textFormat" as const });
    const int = (id: string, name: string) => ({ id, name, format: "integerFormat" as const });
    const usd = (id: string, name: string) => ({ id, name, format: "currencyFormat" as const, formatOptions: { format: "$#,##0" } });
    return {
      sources: [{
        id: "payouts",
        name: "Payouts, every run",
        data: rows as unknown as Record<string, string | number>[],
        fields: [
          text("run", "Payout run"), int("order", "Week"), text("outcome", "Outcome"), text("caughtBy", "Caught by"),
          text("group", "Group"), text("account", "Account"), text("payout", "Payout linked to"), text("device", "Device"),
          usd("amount", "Amount"), int("count", "Payees"), int("paid", "Paid on time"), int("paused", "Paused"),
          int("fraud", "Fraud payees"), int("mistaken", "Real people paused"),
          int("byEngine", "Linked-group engine"), int("byRule", "Learned rule"), int("byNetwork", "Another program's ring"), int("missed", "Missed"),
          usd("kept", "Kept from fraud"), usd("leaked", "Leaked to fraud"), usd("atStake", "Fraud money at stake"),
        ],
      }],
    };
  }, [rows]);

  const initialState = useMemo(
    (): AgReportState<InsightsRegistry> => ({
      selectedPageId: "insights",
      pages: [
        {
          id: "insights",
          widgets: {
            // No title of its own: the filter labels itself ("Filter by: Payout run"). Its buttons are the
            // console's pills: hairline outline, ink when picked.
            runFilter: {
              type: "button-filter",
              dataMapping: { value: [{ id: "payouts.run" }] },
              format: { style: {
                dimensions: { height: 36 },
                defaultItem: { typography: { fontSize: 14 }, borderEnabled: true, borderWidth: 1, borderRadius: 18, borderColor: "var(--rf-hairline)", backgroundColor: "var(--rf-white)", color: "var(--rf-ink)" },
                activeItem: { backgroundColor: "var(--rf-ink)", borderColor: "var(--rf-ink)", color: "var(--rf-white)" },
              } },
            },
            kpiAtStake: { type: "value", dataMapping: { value: [{ id: "payouts.atStake", aggregation: "sum" }] }, format: kpi("Fraud attempted") },
            kpiKept: { type: "value", dataMapping: { value: [{ id: "payouts.kept", aggregation: "sum" }] }, format: kpi("Kept from fraud") },
            kpiLeaked: { type: "value", dataMapping: { value: [{ id: "payouts.leaked", aggregation: "sum" }] }, format: kpi("Still leaked", true) },
            kpiMistaken: { type: "value", dataMapping: { value: [{ id: "payouts.mistaken", aggregation: "sum" }] }, format: kpi("Real people paused", true) },
            stoppers: {
              type: "column-chart-stacked",
              // One measure per part of Ringfence, so the series keep this order, and the theme palette's
              // colours, whatever is filtered: ink, slate and grey for what each part caught, coral for what got through.
              dataMapping: { categoryKey: [{ id: "payouts.run" }], valueKey: ["byEngine", "byRule", "byNetwork", "missed"].map((f) => ({ id: `payouts.${f}`, aggregation: "sum" as const })) },
              sort: [{ field: { id: "payouts.order", aggregation: "min" }, direction: "asc" }],
              format: { ...title("Who stopped the fraud, run by run"), style: { theme: { common: { legend: { enabled: true, position: "bottom" } } } } },
            },
            ringWatch: { type: "ringWatch", dataMapping: {} },
            pivot: {
              type: "pivot-grid",
              dataMapping: { rows: [{ id: "payouts.run" }], columns: [{ id: "payouts.outcome" }], values: [{ id: "payouts.count", aggregation: "sum" }] },
              format: title("Payees by run and outcome"),
            },
            pausedGrid: {
              type: "grid",
              dataMapping: { cols: ["run", "group", "account", "payout", "device", "caughtBy", "amount"].map((f) => ({ id: `payouts.${f}` })) },
              format: title("Every paused account"),
            },
          },
          // The grid lists paused payees only; the run filter still applies on top.
          filter: { widget: { pausedGrid: [{ field: { id: "payouts.paused" }, model: { operator: "equals", value: 1 } }] } },
          widgetLayout: {
            runFilter: at(0, 0, 24, 7),
            kpiAtStake: at(0, 7, 6, 8),
            kpiKept: at(6, 7, 6, 8),
            kpiLeaked: at(12, 7, 6, 8),
            kpiMistaken: at(18, 7, 6, 8),
            stoppers: at(0, 15, 15, 26),
            ringWatch: at(15, 15, 9, 26),
            pivot: at(0, 41, 24, 18),
            pausedGrid: at(0, 59, 24, 26),
          },
        },
      ],
    }),
    [],
  );

  const submit = (e: FormEvent) => { e.preventDefault(); void ask(question); };

  return (
    // Edit mode takes the whole window: Studio's data, assistant and widget panels need the room.
    <div className={`flex flex-col gap-3 ${mode === "edit" ? "fixed inset-0 z-50 bg-rf-white pt-4" : "h-full"}`}>
      <div className="flex flex-wrap items-center gap-2 px-6">
        {aiEnabled && (
          <form onSubmit={submit} className="flex min-w-[320px] flex-1 items-center gap-2 rounded-full border border-rf-hairline bg-rf-white py-1 pr-1 pl-5 focus-within:border-rf-ink">
            <span aria-hidden className="text-rf-spark">✦</span>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} aria-label="Ask about your payouts"
              placeholder="Ask about your payouts, and get the answer as a chart…" className="min-h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-rf-slate" />
            <button type="submit" disabled={!question.trim()} className="min-h-9 rounded-full bg-rf-ink px-4 text-sm font-medium text-rf-white disabled:opacity-40">Ask</button>
          </form>
        )}
        {mode === "edit" && (
          <button type="button" onClick={() => { setResets((n) => n + 1); session.current = null; harness.current = null; widgetIds.current = null; setMode("view"); }} className="min-h-9 rounded-full border border-rf-hairline px-4 text-sm hover:bg-rf-mist">Reset layout</button>
        )}
        <button type="button" onClick={() => setMode(mode === "view" ? "edit" : "view")}
          className={`ml-auto min-h-9 rounded-full border border-rf-ink px-4 text-sm font-medium ${mode === "edit" ? "bg-rf-ink text-rf-white" : "bg-rf-white text-rf-ink hover:bg-rf-mist"}`}>
          {mode === "edit" ? "Done editing" : "Edit dashboard"}
        </button>
      </div>
      {aiEnabled && mode === "view" && (
        <div className="flex flex-wrap gap-2 px-6">
          {promptStarters.map((p) => (
            <button key={p.label} type="button" onClick={() => void ask(p.prompt)} className="min-h-8 rounded-full border border-rf-hairline px-3 text-[13px] text-rf-slate hover:border-rf-ink hover:text-rf-ink">{p.label}</button>
          ))}
        </div>
      )}
      {mode === "edit" && (
        <p className="px-6 text-sm text-rf-slate">Editing: drag, resize or restyle any widget, or add one over the same data from the panels{aiEnabled ? ". The AI assistant builds what you ask for on the right" : ""}.</p>
      )}
      <div ref={canvas} className="min-h-0 flex-1">
        <AgStudioProvider licenseKey={licenseKey} modules={aiEnabled ? [AgStudioAiModule] : []}>
          <AgStudio<InsightsRegistry>
            key={resets}
            style={{ height: "100%", width: "100%" }}
            theme={ringfenceStudioTheme}
            widgets={widgets}
            data={data}
            initialState={initialState}
            // Every measure here is a sum, so the "(sum)" Studio adds to each name only adds noise; a
            // pivot cell with nobody in it reads as a dash, not "N/A".
            localeText={{ aggregationSumFieldName: "${name}", aggregationSumBucketName: "${name}", valueNotApplicable: "—" }}
            mode={mode}
            // Edit mode opens Studio's own panels: the data fields to build from, the widget editor, the assistant.
            panels={{ view: {}, edit: { left: ["data"], right: aiEnabled ? ["ai", "edit"] : ["edit"] } }}
            onApiReady={(e) => { api.current = e.api as AgStudioApi; }}
            onStateUpdated={(e) => showNewWidget(e.state)}
            ai={aiEnabled ? (params) => getHarness(params.api as AgStudioApi)! : undefined}
            onErrorRaised={(e) => console.error("[insights] AG Studio error:", e)}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}
