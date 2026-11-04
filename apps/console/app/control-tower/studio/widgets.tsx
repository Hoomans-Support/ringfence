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
import { useEffect, useState, type ReactNode } from "react";
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

// AG Studio's own root canvas sets font-size:14px/line-height:16px, inherited by everything
// mounted inside it; a Tailwind arbitrary size like `text-[Npx]` only sets font-size, never
// line-height, so any custom text here that doesn't set its own `leading-*` silently keeps
// that inherited 16px regardless of its own size - fine at 13-15px, but a 32-40px number then
// overflows its own line box into the text above it. Every custom size below sets its own.
function WidgetHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-[17px] font-semibold tracking-[-0.02em] leading-[1.3] text-rf-ink">{children}</h3>;
}

function RingGraphWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RingGraphOptions;
  const hasOperator = o.operatorIds.size > 0;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <WidgetHeading>Ring graph</WidgetHeading>
          <p className="text-sm text-rf-slate">
            Ring <code className="font-mono text-rf-ink">{o.ringLabel}</code> · {o.memberCount} accounts linked
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-[13px] text-rf-slate">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rf-ink" aria-hidden="true" />
            Ring member
          </span>
          {hasOperator && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rf-spark" aria-hidden="true" />
              Shares the most common device
            </span>
          )}
        </div>
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
  const total = o.keptUsd + o.leakedUsd;
  // No ring money at all (e.g. a week with no active ring) reads as "nothing to catch", not "0%
  // caught" - the PRD's own fire drill metric (FR-23) is the right place for a real without/with
  // baseline; this is just the two numbers this run already has, given context against each other.
  const caughtPct = total > 0 ? Math.round((o.keptUsd / total) * 100) : 100;
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <WidgetHeading>Money kept vs. leaked</WidgetHeading>
      <div>
        <p className="text-[13px] font-medium uppercase tracking-wide leading-[1.3] text-rf-slate">Kept from the ring</p>
        <p className="font-mono text-[36px] font-semibold tracking-[-0.02em] leading-[1.15] text-rf-ink">{money(o.keptUsd)}</p>
        <p className="text-[13px] leading-[1.3] text-rf-slate">{caughtPct}% of this ring's payouts caught</p>
      </div>
      <div>
        <p className="text-[13px] font-medium uppercase tracking-wide leading-[1.3] text-rf-slate">Leaked to the ring</p>
        <p className={`font-mono text-[20px] font-semibold tracking-[-0.02em] leading-[1.2] ${o.leakedUsd > 0 ? "text-rf-spark-text" : "text-rf-slate"}`}>
          {money(o.leakedUsd)}
        </p>
      </div>
    </div>
  );
}

// The PRD's own fire-drill target (final-prd.docx, non-functional requirements): under 1% of
// honest members held. Gives the viewer something to judge the percentage against.
const FALSE_HOLD_TARGET_PCT = 1;

function FalseHoldWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as FalseHoldOptions;
  // Local and ephemeral, not a real release: the console never calls real PayPal or moves money
  // (ground rules in agent-coordination.md) and there's no release endpoint anywhere yet - this
  // simulates what design.md's own Voice example ("Held by mistake? Release it in one click.")
  // describes, same spirit as the review queue's fixture-only Reset/Step controls. The percentage
  // updates with it (not frozen at the original rate) so clicking it tells the whole story: catch
  // the mistake, fix it, see the meter move.
  const [released, setReleased] = useState(false);
  const remaining = released ? 0 : o.falseHoldCount;
  const pct = o.heldCount > 0 ? Math.round((remaining / o.heldCount) * 100) : 0;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <WidgetHeading>False-hold meter</WidgetHeading>
      <p className="font-mono text-[40px] font-semibold tracking-[-0.02em] leading-[1.1] text-rf-spark-text">
        {pct}%
      </p>
      <p className="text-sm text-rf-slate">
        {remaining} of {o.heldCount} held turned out honest (target: under {FALSE_HOLD_TARGET_PCT}%).
      </p>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => setReleased(true)}
          className="self-start rounded-full bg-rf-ink px-3 py-1.5 text-sm font-medium text-white hover:opacity-85"
        >
          Held by mistake? Release {remaining === 1 ? "it" : "them"} in one click
        </button>
      ) : (
        released && <p className="text-sm text-rf-slate">Released — simulated, nothing was sent to PayPal.</p>
      )}
    </div>
  );
}

function RuleRobustnessWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RuleRobustnessOptions;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
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
