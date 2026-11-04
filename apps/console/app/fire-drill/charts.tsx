"use client";

// Charts for the fire drill page. Colour choice: the three gates (no gate / per-request gate /
// Ringfence) aren't an arbitrary categorical set - they're an ordered "how much protection"
// progression, and Ringfence is literally the one result this screen is arguing for. So instead of
// inventing a second categorical hue the brand guide doesn't define, this reuses the brand's own
// emphasis scale: --rf-ink (quiet/structural) for the worst case, --rf-slate (secondary) for the
// middle case, --rf-spark (the one highlight) for Ringfence - the same "spark marks the one thing
// that matters" rule the status chips use. Validated with the dataviz skill's palette checker:
// contrast, CVD-separation and normal-vision-floor all pass in both themes; the categorical
// lightness-band/chroma-floor checks fail, but those assume a multi-hue rainbow, which is exactly
// what design.md rules out ("coral is a single highlight... never a primary colour to apply
// everywhere") - not applicable to a deliberate two-neutral-plus-one-accent system.
//
// Tooltips are native SVG <title> elements (a hover bonus), not a custom crosshair layer: every
// value is already reachable without hovering, through the axis ticks, the legend, and the table
// view each chart ships beside it - keeping within this page's time budget without gating any
// value behind mouse hover.
import type { Gate, SweepRow } from "@/lib/fire-drill-data";
import { money, pct2 } from "@/lib/format";

// Functions can't cross the server/client prop boundary, so charts take a format key (resolved to
// one of the shared formatters above) rather than a formatter function passed down from page.tsx.
type Format = "money" | "pct2";
const FORMAT: Record<Format, (v: number) => string> = { money, pct2 };

const GATE_COLOR: Record<Gate, string> = {
  "no gate": "var(--rf-ink)",
  "per-request gate": "var(--rf-slate)",
  Ringfence: "var(--rf-spark)",
};

const GATES_ORDER: Gate[] = ["no gate", "per-request gate", "Ringfence"];

function Legend({ gates = GATES_ORDER }: { gates?: Gate[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rf-slate">
      {gates.map((gate) => (
        <li key={gate} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: GATE_COLOR[gate] }} />
          {gate}
        </li>
      ))}
    </ul>
  );
}

const BAR_WIDTH = 56;
const BAR_CHART_HEIGHT = 200;
const BAR_CHART_PAD = { top: 28, bottom: 28, side: 32 };

/** A single-series bar per gate - no legend needed, each bar is directly labeled on its own axis tick. */
export function GateBarChart({ rows, format }: { rows: { gate: Gate; value: number }[]; format: Format }) {
  const valueLabel = FORMAT[format];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const innerHeight = BAR_CHART_HEIGHT - BAR_CHART_PAD.top - BAR_CHART_PAD.bottom;
  const slot = 100;
  const width = BAR_CHART_PAD.side * 2 + rows.length * slot;

  return (
    <svg viewBox={`0 0 ${width} ${BAR_CHART_HEIGHT}`} role="img" aria-label="Dollars leaked per 1,000 payouts, by gate" className="h-[200px] w-full">
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={BAR_CHART_PAD.side}
          x2={width - BAR_CHART_PAD.side}
          y1={BAR_CHART_PAD.top + innerHeight * (1 - f)}
          y2={BAR_CHART_PAD.top + innerHeight * (1 - f)}
          stroke="var(--rf-hairline)"
          strokeWidth={1}
        />
      ))}
      {rows.map((row, i) => {
        const h = Math.max(0, (row.value / max) * innerHeight);
        const x = BAR_CHART_PAD.side + i * slot + (slot - BAR_WIDTH) / 2;
        const y = BAR_CHART_PAD.top + innerHeight - h;
        return (
          <g key={row.gate}>
            <title>{`${row.gate}: ${valueLabel(row.value)}`}</title>
            {h > 0 ? (
              <path
                d={`M${x},${y + h} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + BAR_WIDTH - 4} Q${x + BAR_WIDTH},${y} ${x + BAR_WIDTH},${y + 4} V${y + h} Z`}
                fill={GATE_COLOR[row.gate]}
              />
            ) : (
              <line x1={x} x2={x + BAR_WIDTH} y1={y + h} y2={y + h} stroke={GATE_COLOR[row.gate]} strokeWidth={2} />
            )}
            <text x={x + BAR_WIDTH / 2} y={y - 8} textAnchor="middle" className="fill-rf-ink font-mono text-[11px] font-medium">
              {valueLabel(row.value)}
            </text>
            <text x={x + BAR_WIDTH / 2} y={BAR_CHART_HEIGHT - 8} textAnchor="middle" className="fill-rf-slate text-[11px]">
              {row.gate}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const LINE_CHART_HEIGHT = 240;
const LINE_CHART_PAD = { top: 16, bottom: 28, left: 8, right: 56 };

/** One line per gate, swept across an ordered category (ring share or evasion). */
export function GateLineSweep({
  rows,
  metric,
  format,
  xLabel,
}: {
  rows: SweepRow[];
  metric: "leakedPer1000Usd" | "honestHeldPct";
  format: Format;
  xLabel: string;
}) {
  const valueLabel = FORMAT[format];
  const labels = [...new Set(rows.map((r) => r.label))];
  const width = 560;
  const innerWidth = width - LINE_CHART_PAD.left - LINE_CHART_PAD.right;
  const innerHeight = LINE_CHART_HEIGHT - LINE_CHART_PAD.top - LINE_CHART_PAD.bottom;
  const max = Math.max(1, ...rows.map((r) => r[metric]));
  const xAt = (i: number) => LINE_CHART_PAD.left + (labels.length === 1 ? innerWidth / 2 : (innerWidth * i) / (labels.length - 1));
  const yAt = (v: number) => LINE_CHART_PAD.top + innerHeight * (1 - v / max);

  const series = GATES_ORDER.map((gate) => ({
    gate,
    points: labels.map((label, i) => {
      const row = rows.find((r) => r.label === label && r.gate === gate);
      return { x: xAt(i), y: yAt(row?.[metric] ?? 0), value: row?.[metric] ?? 0 };
    }),
  }));

  // Direct end-labels for the rightmost point of each line, skipped when two would land close
  // enough to collide (marks-and-anatomy.md: "don't stack them" - the legend + table still carry
  // the value for any line whose label is dropped here).
  const endYs = series.map((s) => s.points[s.points.length - 1]?.y ?? 0);
  const labelOk = endYs.map((y, i) => endYs.every((other, j) => i === j || Math.abs(other - y) >= 14));

  return (
    <div>
      <Legend />
      <svg viewBox={`0 0 ${width} ${LINE_CHART_HEIGHT}`} role="img" aria-label={`${xLabel} swept against ${metric === "leakedPer1000Usd" ? "dollars leaked" : "honest members held"}, by gate`} className="mt-2 h-[240px] w-full">
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={LINE_CHART_PAD.left}
            x2={width - LINE_CHART_PAD.right}
            y1={LINE_CHART_PAD.top + innerHeight * (1 - f)}
            y2={LINE_CHART_PAD.top + innerHeight * (1 - f)}
            stroke="var(--rf-hairline)"
            strokeWidth={1}
          />
        ))}
        {labels.map((label, i) => (
          <text key={label} x={xAt(i)} y={LINE_CHART_HEIGHT - 8} textAnchor="middle" className="fill-rf-slate text-[11px]">
            {label}
          </text>
        ))}
        {series.map(({ gate, points }) => (
          <g key={gate}>
            <path
              d={points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={GATE_COLOR[gate]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={5} fill={GATE_COLOR[gate]} stroke="var(--rf-white)" strokeWidth={2}>
                <title>{`${gate}, ${labels[i]}: ${valueLabel(p.value)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {series.map(({ gate, points }, i) =>
          labelOk[i] ? (
            <text
              key={gate}
              x={(points[points.length - 1]?.x ?? 0) + 10}
              y={(points[points.length - 1]?.y ?? 0) + 4}
              className="font-mono text-[11px] font-medium"
              style={{ fill: GATE_COLOR[gate] }}
            >
              {valueLabel(points[points.length - 1]?.value ?? 0)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
