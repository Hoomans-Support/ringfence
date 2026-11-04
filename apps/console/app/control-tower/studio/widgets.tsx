"use client";

// The control tower's four custom AG Studio widgets (FR-17). None of them use Studio's own data
// engine — each number here is already computed server-side (scoreRun, checkClaims, attackRule),
// so there is nothing left to query or aggregate. Instead, each widget definition's `options` field
// (ag-studio's own documented channel for "data passed directly to the widget", not Studio's
// field-mapping system) carries the precomputed value straight from the control tower page's props,
// rebuilt fresh on every render — simpler and more certain than relying on React context surviving
// whatever internal portal Studio uses to mount a custom `comp`.
import type { AgDefaultWidgetDefinition, AgWidgetApi, AgWidgetFormParams, AgWidgetParams } from "ag-studio";
import { createWidgets, type AgRegistry, type AgWidgetDefinition } from "ag-studio-react";
import { useEffect, type ReactNode } from "react";
import type { LayoutLink, PositionedNode } from "@/lib/graph-layout";
import { RingGraph } from "../../review/[ringId]/ring-graph";

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

export interface RingGraphOptions {
  ringLabel: string;
  memberCount: number;
  nodes: PositionedNode[];
  links: LayoutLink[];
  operatorIds: Set<string>;
  width: number;
  height: number;
}

export interface MoneyOptions {
  keptUsd: number;
  leakedUsd: number;
}

export interface FalseHoldOptions {
  heldCount: number;
  falseHoldCount: number;
}

export interface RuleRobustnessOptions {
  ruleId: string;
  variants: number;
  caught: number;
  heldOut: number;
  heldOutCaught: number;
  note?: string;
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// --- Components: plain cards in the app's own voice, not a generic chart/gauge look ---

function WidgetHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-rf-ink">{children}</h3>;
}

function RingGraphWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RingGraphOptions;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div>
        <WidgetHeading>Ring graph</WidgetHeading>
        <p className="text-sm text-rf-slate">
          Ring <code className="font-mono text-rf-ink">{o.ringLabel}</code> · {o.memberCount} accounts linked
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <RingGraph nodes={o.nodes} links={o.links} operatorIds={o.operatorIds} width={o.width} height={o.height} />
      </div>
    </div>
  );
}

function MoneyWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as MoneyOptions;
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <WidgetHeading>Money kept vs. leaked</WidgetHeading>
      <div>
        <p className="text-[13px] font-medium uppercase tracking-wide text-rf-slate">Kept from the ring</p>
        <p className="font-mono text-[32px] font-semibold tracking-[-0.02em] text-rf-ink">{money(o.keptUsd)}</p>
      </div>
      <div>
        <p className="text-[13px] font-medium uppercase tracking-wide text-rf-slate">Leaked to the ring</p>
        <p className={`font-mono text-[32px] font-semibold tracking-[-0.02em] ${o.leakedUsd > 0 ? "text-rf-spark-text" : "text-rf-ink"}`}>
          {money(o.leakedUsd)}
        </p>
      </div>
    </div>
  );
}

function FalseHoldWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as FalseHoldOptions;
  const rate = o.heldCount > 0 ? o.falseHoldCount / o.heldCount : 0;
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <WidgetHeading>False-hold meter</WidgetHeading>
      <p className="font-mono text-[40px] font-semibold tracking-[-0.02em] text-rf-spark-text">
        {(rate * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%
      </p>
      <p className="text-sm text-rf-slate">
        {o.falseHoldCount} of {o.heldCount} held turned out honest — release them in one click.
      </p>
    </div>
  );
}

function RuleRobustnessWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RuleRobustnessOptions;
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <WidgetHeading>
        Rule robustness · <code className="font-mono text-rf-slate">{o.ruleId}</code>
      </WidgetHeading>
      {o.note ? <p className="text-sm text-rf-slate">{o.note}</p> : <>
      <p className="text-[17px] leading-[1.5] text-rf-ink">
        Survived{" "}
        <span className="font-mono text-[22px] font-semibold text-rf-spark-text">
          {o.caught} of {o.variants}
        </span>{" "}
        disguised attacks.
      </p>
      <p className="text-sm text-rf-slate">
        {o.heldOutCaught} of {o.heldOut} held-out copies caught too.
      </p>
      </>}
    </div>
  );
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

const moneyWidgetDefinition: AgWidgetDefinition<"money", any, any, MoneyOptions> = {
  id: "money",
  label: "Money kept vs. leaked",
  form: noMappingForm,
  comp: MoneyWidget,
  defaultSize: { width: 320, height: 220 },
  minSize: { width: 220, height: 160 },
};

const falseHoldWidgetDefinition: AgWidgetDefinition<"falseHold", any, any, FalseHoldOptions> = {
  id: "falseHold",
  label: "False-hold meter",
  form: noMappingForm,
  comp: FalseHoldWidget,
  defaultSize: { width: 320, height: 220 },
  minSize: { width: 220, height: 160 },
};

const ruleRobustnessWidgetDefinition: AgWidgetDefinition<"ruleRobustness", any, any, RuleRobustnessOptions> = {
  id: "ruleRobustness",
  label: "Rule robustness",
  form: noMappingForm,
  comp: RuleRobustnessWidget,
  defaultSize: { width: 320, height: 220 },
  minSize: { width: 220, height: 160 },
};

export interface ControlTowerRegistry extends AgRegistry {
  widgets: readonly (
    | AgDefaultWidgetDefinition
    | typeof ringGraphWidgetDefinition
    | typeof moneyWidgetDefinition
    | typeof falseHoldWidgetDefinition
    | typeof ruleRobustnessWidgetDefinition
  )[];
}

export const controlTowerWidgets = createWidgets<ControlTowerRegistry>({
  additionalTypes: [ringGraphWidgetDefinition, moneyWidgetDefinition, falseHoldWidgetDefinition, ruleRobustnessWidgetDefinition],
  menu: [
    {
      label: "Control tower",
      widgetIds: ["ringGraph", "money", "falseHold", "ruleRobustness"],
    },
  ],
});
