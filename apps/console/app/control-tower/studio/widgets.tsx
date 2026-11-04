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
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { computeLayout, type LayoutLink } from "@/lib/graph-layout";
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
  nodeIds: string[];
  links: LayoutLink[];
  operatorIds: Set<string>;
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
  /** The existing step-to-next-week URL, reused by the "Next: retrain" button - never a fabricated
   *  "improved rule", since week 2's own card already shows the real "waiting on A's evaluator"
   *  state rather than invented numbers. */
  nextStepHref?: string;
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// --- Components: plain cards in the app's own voice, not a generic chart/gauge look ---

// AG Studio's own root canvas sets font-size:14px/line-height:16px, inherited by everything
// mounted inside it; a Tailwind arbitrary size like `text-[Npx]` only sets font-size, never
// line-height, so any custom text here that doesn't set its own `leading-*` silently keeps
// that inherited 16px regardless of its own size - fine at 13-15px, but a 32-40px number then
// overflows its own line box into the text above it. Every custom size below sets its own.
function WidgetHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-[16px] font-semibold tracking-[-0.02em] leading-[1.3] text-rf-ink">{children}</h3>;
}

/** Measures its own box with ResizeObserver and reports it, so a parent can lay out content at the
 *  real rendered size instead of a guessed one - needed here because the AG Studio grid's column
 *  width scales with viewport width while its row height is fixed, so no single hardcoded aspect
 *  ratio matches the card at every viewport. */
function useMeasuredSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number } | null] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

function RingGraphWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RingGraphOptions;
  const operatorCount = o.operatorIds.size;
  const [boxRef, size] = useMeasuredSize<HTMLDivElement>();
  const layout = useMemo(() => (size ? computeLayout(o.nodeIds, o.links, size) : null), [o.nodeIds, o.links, size]);

  return (
    <div className="flex h-full flex-col gap-2 p-5">
      <div>
        <WidgetHeading>Ring graph</WidgetHeading>
        <p className="text-sm text-rf-slate">
          Ring <code className="font-mono text-rf-ink">{o.ringLabel}</code> · {o.memberCount} accounts linked
        </p>
        {operatorCount > 0 && (
          <p className="mt-1 text-sm text-rf-slate">
            Orange accounts share one device, the strongest ring signal — {operatorCount} of {o.memberCount} here. That's a device count,
            not a hold count; every account in this ring is held either way.
          </p>
        )}
        <div className="mt-2 flex gap-3 text-[12px] text-rf-slate">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-rf-ink" aria-hidden="true" />
            Ring member
          </span>
          {operatorCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full bg-rf-spark" aria-hidden="true" />
              Shares the most common device (larger dot, design.md's operator signal)
            </span>
          )}
        </div>
      </div>
      {/* No fixed aspect-ratio box: width (w-full) and height (flex-1) are both already set by the
          flex layout, so an aspect-ratio here would be inert anyway. Instead the SVG's viewBox is
          set to this box's own measured size, so it always fills it exactly with zero letterboxing
          - stronger than approximating a fixed ~4:3, and necessary since the AG Studio grid's
          column width scales with viewport while its row height doesn't, so the card's real shape
          isn't constant across viewports. */}
      <div ref={boxRef} className="min-h-0 w-full flex-1">
        {layout && size && <RingGraph nodes={layout.nodes} links={layout.links} operatorIds={o.operatorIds} width={size.width} height={size.height} />}
      </div>
    </div>
  );
}

function MoneyWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as MoneyOptions;
  // "Without Ringfence" is exactly kept+leaked: every dollar this ring would have been paid is
  // either the dollar we held (kept) or the dollar that got through anyway (leaked) - already in
  // hand from the two numbers this widget already receives, not a new sim concept. The PRD's own
  // fire drill (FR-23, A-gated) is the real without/with baseline across many runs; this is just
  // this one run's own two numbers, given context against each other.
  const baselineUsd = o.keptUsd + o.leakedUsd;
  const caughtPct = baselineUsd > 0 ? Math.round((o.keptUsd / baselineUsd) * 100) : 100;
  return (
    <div className="flex h-full flex-col gap-2 p-5">
      <WidgetHeading>Money kept vs. leaked</WidgetHeading>
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wide leading-[1.3] text-rf-slate">Kept from the ring</p>
        <p className="font-mono text-[40px] font-semibold tracking-[-0.02em] leading-[1.1] text-rf-ink">{money(o.keptUsd)}</p>
        <p className="text-[13px] leading-[1.3] text-rf-slate">
          Without Ringfence: {money(baselineUsd)} would've leaked ({caughtPct}% caught).
        </p>
      </div>
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wide leading-[1.3] text-rf-slate">Leaked to the ring</p>
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
  // (a ground rule from the A/B task split) and there's no release endpoint anywhere yet - this
  // simulates what design.md's own Voice example ("Held by mistake? Release it in one click.")
  // describes, same spirit as the review queue's fixture-only Reset/Step controls. The percentage
  // updates with it (not frozen at the original rate) so clicking it tells the whole story: catch
  // the mistake, fix it, see the meter move.
  const [released, setReleased] = useState(false);
  const remaining = released ? 0 : o.falseHoldCount;
  const pct = o.heldCount > 0 ? Math.round((remaining / o.heldCount) * 100) : 0;
  return (
    <div className="flex h-full flex-col gap-1 p-5">
      <WidgetHeading>False-hold meter</WidgetHeading>
      <p className="font-mono text-[40px] font-semibold tracking-[-0.02em] leading-none text-rf-spark-text">
        {pct}%
      </p>
      <p className="text-sm text-rf-slate">
        {remaining} of {o.heldCount} held turned out honest (target: under {FALSE_HOLD_TARGET_PCT}%).
      </p>
      {remaining > 0 ? (
        <div className="flex flex-col items-start gap-1">
          <p className="text-sm text-rf-slate">Held by mistake?</p>
          <button
            type="button"
            onClick={() => setReleased(true)}
            className="rounded-full bg-rf-ink px-3 py-1 text-sm font-medium text-rf-white hover:opacity-85"
          >
            Release {remaining} honest {remaining === 1 ? "account" : "accounts"}
          </button>
        </div>
      ) : (
        released && <p className="text-sm text-rf-slate">Released — simulated, nothing was sent to PayPal.</p>
      )}
    </div>
  );
}

function RuleRobustnessWidget({ config, widgetApi }: AgWidgetParams) {
  useDisplayedOnMount(widgetApi);
  const o = config.options as RuleRobustnessOptions;
  const caughtPct = o.variants > 0 ? Math.round((o.caught / o.variants) * 1000) / 10 : 0;
  const heldOutPct = o.heldOut > 0 ? Math.round((o.heldOutCaught / o.heldOut) * 100) : 0;
  return (
    <div className="flex h-full flex-col gap-1 p-5">
      <WidgetHeading>
        Rule robustness · <code className="font-mono text-rf-slate">{o.ruleId}</code>
      </WidgetHeading>
      {o.note ? (
        <p className="text-sm text-rf-slate">{o.note}</p>
      ) : (
        <>
          {/* Same font/scale as the other two cards' one big number (Money's $460, False-hold's
              8%) - this card had no standalone headline figure before, just a number buried in a
              sentence, which was the typography pass's own inconsistency to fix. Neutral ink, not
              the alarm coral: a rule's own test score isn't a problem to flag the way a false hold
              or a leak is. */}
          <p className="font-mono text-[40px] font-semibold tracking-[-0.02em] leading-none text-rf-ink">{caughtPct}%</p>
          <p className="text-sm text-rf-slate">
            Rule {o.ruleId} caught {o.caught} of {o.variants} disguised attacks.
          </p>
          <p className="text-sm text-rf-slate">
            On {o.heldOut} held-out variants, it caught {o.heldOutCaught} ({heldOutPct}%).
          </p>
          {o.nextStepHref && (
            <Link
              href={o.nextStepHref}
              className="self-start rounded-full border border-rf-hairline px-3 py-1 text-sm font-medium text-rf-ink hover:bg-rf-mist"
            >
              Next: retrain on disguised variants
            </Link>
          )}
        </>
      )}
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
