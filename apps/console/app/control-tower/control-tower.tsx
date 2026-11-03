"use client";

// The control tower (FR-17): one fixed AG Studio page, four custom widgets, no drag-and-drop
// editing exposed (mode stays "view" — there is no UI here that switches it to "edit"). AG Studio
// depends on the browser (it measures its own canvas), so — same guard the AG Grid PayPal starter
// uses in app/dashboard/dashboard.tsx — the real <AgStudio> only renders once this has mounted on
// the client; the server/first paint shows a plain skeleton instead of risking a hydration mismatch.
import { useMemo, useSyncExternalStore } from "react";
import type { AgReportState } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { ControlTowerRegistry, FalseHoldOptions, MoneyOptions, RingGraphOptions, RuleRobustnessOptions } from "./studio/widgets";
import { controlTowerWidgets } from "./studio/widgets";
import { ringfenceStudioTheme } from "./studio/theme";

export interface ControlTowerData {
  licenseKey?: string;
  ringGraph: RingGraphOptions;
  money: MoneyOptions;
  falseHold: FalseHoldOptions;
  ruleRobustness: RuleRobustnessOptions;
}

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({ xTrack, yTrack, xSpan, ySpan });

const noSubscription = () => () => {};

export function ControlTower(data: ControlTowerData) {
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return inBrowser ? <ReadyControlTower {...data} /> : <ControlTowerSkeleton />;
}

function ControlTowerSkeleton() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 p-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
      <div className="grid grid-rows-3 gap-4">
        <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
        <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
        <div className="animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
      </div>
    </div>
  );
}

function ReadyControlTower({ licenseKey, ringGraph, money, falseHold, ruleRobustness }: ControlTowerData) {
  // Rebuilt fresh every render: each widget's `options` is how it receives this run's numbers (see
  // studio/widgets.tsx), so a new run's data means a new widgets config, not a push into Studio.
  const widgets = useMemo(() => {
    const config = controlTowerWidgets;
    return {
      ...config,
      widgets: config.widgets.map((w) => {
        switch (w.id) {
          case "ringGraph":
            return { ...w, options: ringGraph };
          case "money":
            return { ...w, options: money };
          case "falseHold":
            return { ...w, options: falseHold };
          case "ruleRobustness":
            return { ...w, options: ruleRobustness };
          default:
            return w;
        }
      }),
    };
  }, [ringGraph, money, falseHold, ruleRobustness]);

  const initialState = useMemo(
    (): AgReportState<ControlTowerRegistry> => ({
      selectedPageId: "control-tower",
      pages: [
        {
          id: "control-tower",
          widgets: {
            ringGraph: { type: "ringGraph", dataMapping: {} },
            money: { type: "money", dataMapping: {} },
            falseHold: { type: "falseHold", dataMapping: {} },
            ruleRobustness: { type: "ruleRobustness", dataMapping: {} },
          },
          widgetLayout: {
            ringGraph: at(0, 0, 14, 42),
            money: at(14, 0, 10, 14),
            falseHold: at(14, 14, 10, 14),
            ruleRobustness: at(14, 28, 10, 14),
          },
        },
      ],
    }),
    [],
  );

  return (
    <AgStudioProvider licenseKey={licenseKey}>
      <AgStudio<ControlTowerRegistry>
        style={{ height: "100%", width: "100%" }}
        theme={ringfenceStudioTheme}
        widgets={widgets}
        // Studio's data engine never finishes initializing (onStudioReady never fires, renderState
        // stays "loading" forever) if `data` is left undefined, even though AgStudioProperties types
        // it as optional — confirmed by instrumenting onRenderStateChanged. None of our widgets query
        // it, but Studio still needs an (empty is fine) AgDataSourcesDefinition to boot.
        data={{ sources: [] }}
        initialState={initialState}
        mode="view"
        panels={{ view: {} }}
        onErrorRaised={(e) => console.error("[control tower] AG Studio error:", e)}
      />
    </AgStudioProvider>
  );
}
