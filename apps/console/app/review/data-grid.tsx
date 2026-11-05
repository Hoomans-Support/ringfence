"use client";

// The review queue's grid. AG Grid Community has no built-in row-grouping (that's Enterprise), so
// grouping is hand-built on top of Community's full-width-row feature: one synthetic, clickable
// header row per hold group, followed by its member rows unless collapsed. Keeping AG Grid itself
// as the renderer (rather than a plain HTML table) keeps this eligible for its sponsor prize
// (design.md).

import { useCallback, useMemo, useState } from "react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  enableDevValidations,
  themeQuartz,
  type ColDef,
  type ValueFormatterParams,
} from "ag-grid-community";
import { AgGridProvider, AgGridReact, type CustomCellRendererProps } from "ag-grid-react";

if (process.env.NODE_ENV !== "production") {
  enableDevValidations();
}

const modules = [ClientSideRowModelModule, ColumnAutoSizeModule, CellStyleModule];

// Ringfence tokens (design.md): ink for structure, coral only for the Held status itself.
const theme = themeQuartz.withParams({
  fontFamily: "var(--font-sans)",
  accentColor: "var(--rf-spark)",
  foregroundColor: "var(--rf-ink)",
  backgroundColor: "var(--rf-white)",
  borderColor: "var(--rf-hairline)",
  headerFontWeight: 600,
  headerTextColor: "var(--rf-slate)",
  headerBackgroundColor: "var(--rf-white)",
  rowHoverColor: "var(--rf-mist)",
  oddRowBackgroundColor: "var(--rf-mist)",
});

export interface ReviewRow {
  group: string;
  kind: "ring" | "pair" | "rule";
  senderItemId: string;
  receiver: string;
  amount: number;
  reasons: string;
  holdExpiresAt: string;
}

/** A group's own collapsible header row — rendered full-width, never a real payout. */
interface GroupHeaderRow {
  isGroupHeader: true;
  group: string;
  kind: ReviewRow["kind"];
  count: number;
  totalAmount: number;
  collapsed: boolean;
}

type GridRow = ReviewRow | GroupHeaderRow;

const formatMoney = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const amountFormatter = ({ value }: ValueFormatterParams<GridRow>) => (typeof value === "number" ? formatMoney(value) : "");
const formatExpiry = ({ value }: ValueFormatterParams<GridRow>) =>
  typeof value === "string"
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : "";

const defaultColDef: ColDef<GridRow> = { resizable: true, sortable: false };
// "reasons" is excluded and left to its own flex: fitting it to content, like every other column,
// would size it to its longest reason list rather than filling the remaining row. AG Grid's own
// dev-only validator (enableDevValidations, above) still flags the flex/fitCellContents pairing
// here (AG Grid #318) even though colIds scopes the conflict away — a known false positive, never
// shown in a production build, so left alone rather than hand-widths.
const autoSizeStrategy = { type: "fitCellContents" as const, colIds: ["senderItemId", "receiver", "amount", "holdExpiresAt"] };

/** A plain caret, not one of the six brand-guide icons (icons.tsx) — just a UI affordance. */
function CaretIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={collapsed ? "-rotate-90" : ""}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function GroupHeaderCell({ data, context }: CustomCellRendererProps<GridRow>) {
  const row = data as GroupHeaderRow;
  const { onToggleGroup } = context as { onToggleGroup: (group: string) => void };
  return (
    <button
      type="button"
      onClick={() => onToggleGroup(row.group)}
      aria-expanded={!row.collapsed}
      className="flex h-full w-full items-center gap-2 bg-rf-mist px-3 text-left text-sm text-rf-ink hover:bg-rf-hairline/40"
    >
      <CaretIcon collapsed={row.collapsed} />
      <code className={`font-mono ${row.kind === "pair" ? "text-rf-slate" : "font-medium"}`}>{row.group}</code>
      <span className="text-rf-slate">
        — {row.count} {row.count === 1 ? "payout" : "payouts"} · {formatMoney(row.totalAmount)}
      </span>
    </button>
  );
}

function isGroupHeader(data: GridRow | undefined): data is GroupHeaderRow {
  return Boolean(data && "isGroupHeader" in data);
}

export function ReviewGrid({ rows }: { rows: ReviewRow[] }) {
  // Grouped in the order each group's rows first appear, not re-sorted: the caller already orders
  // rows by soonest-expiring first, and a group takes its position from its own earliest row.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, ReviewRow[]>();
    for (const row of rows) {
      const members = byGroup.get(row.group);
      if (members) members.push(row);
      else {
        order.push(row.group);
        byGroup.set(row.group, [row]);
      }
    }
    return order.map((group) => ({ group, members: byGroup.get(group)! }));
  }, [rows]);

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const onToggleGroup = useCallback((group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);
  const context = useMemo(() => ({ onToggleGroup }), [onToggleGroup]);

  const gridRows = useMemo<GridRow[]>(() => {
    const out: GridRow[] = [];
    for (const { group, members } of groups) {
      const isCollapsed = collapsed.has(group);
      out.push({
        isGroupHeader: true,
        group,
        kind: members[0]!.kind,
        count: members.length,
        totalAmount: members.reduce((sum, r) => sum + r.amount, 0),
        collapsed: isCollapsed,
      });
      if (!isCollapsed) out.push(...members);
    }
    return out;
  }, [groups, collapsed]);

  // valueGetter, not field: GridRow also includes GroupHeaderRow, which carries none of these
  // fields — full-width rows never call these anyway (isFullWidthRow), but this keeps every
  // column honestly typed against the union instead of casting ReviewRow-only defs onto it.
  const columns = useMemo<ColDef<GridRow>[]>(
    () => [
      { headerName: "Item", cellClass: "font-mono text-rf-slate", valueGetter: ({ data }) => (isGroupHeader(data) ? undefined : data?.senderItemId) },
      { headerName: "Payee", valueGetter: ({ data }) => (isGroupHeader(data) ? undefined : data?.receiver) },
      {
        headerName: "Amount",
        valueGetter: ({ data }) => (isGroupHeader(data) ? undefined : data?.amount),
        valueFormatter: amountFormatter,
        cellClass: "font-mono",
      },
      {
        headerName: "Simulated expiry · 7-day policy",
        valueGetter: ({ data }) => (isGroupHeader(data) ? undefined : data?.holdExpiresAt),
        valueFormatter: formatExpiry,
        cellClass: "font-mono text-rf-slate",
      },
      { headerName: "Why it's held", flex: 2, valueGetter: ({ data }) => (isGroupHeader(data) ? undefined : data?.reasons) },
    ],
    [],
  );

  return (
    <div className="min-h-0 flex-1 p-1">
      <AgGridProvider modules={modules}>
        <AgGridReact<GridRow>
          theme={theme}
          context={context}
          rowData={gridRows}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          autoSizeStrategy={autoSizeStrategy}
          isFullWidthRow={({ rowNode }) => isGroupHeader(rowNode.data)}
          fullWidthCellRenderer={GroupHeaderCell}
          getRowId={({ data }) => (isGroupHeader(data) ? `group:${data.group}` : `item:${data.senderItemId}`)}
          enableCellTextSelection
          overlayNoRowsTemplate='<div class="rf-grid-empty"><strong>Nothing needs review.</strong><span>New holds will appear here after a run.</span></div>'
        />
      </AgGridProvider>
    </div>
  );
}
