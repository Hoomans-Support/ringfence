"use client";

// The review queue's grid. AG Grid Community has no row-grouping (that's Enterprise), so "grouped
// by ring" here means: sorted by group, a Geist Mono "Ring / pair" column carrying the label, and
// row shading that alternates per group so same-group rows read as one block at a glance. True
// collapsible AG Grid row groups are a possible later polish item (see design.md's open
// questions), not required for this task's "shows 25 held, 23 under ring R-12."

import { useMemo } from "react";
import {
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  enableDevValidations,
  QuickFilterModule,
  TextFilterModule,
  themeQuartz,
  type ColDef,
  type ValueFormatterParams,
} from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";

if (process.env.NODE_ENV !== "production") {
  enableDevValidations();
}

const modules = [ClientSideRowModelModule, TextFilterModule, QuickFilterModule, ColumnAutoSizeModule];

// Ringfence tokens (design.md): ink for structure, coral only for the Held status itself.
const theme = themeQuartz.withParams({
  fontFamily: "var(--font-sans)",
  accentColor: "var(--rf-spark)",
  foregroundColor: "var(--rf-ink)",
  borderColor: "var(--rf-hairline)",
  headerFontWeight: 600,
  headerTextColor: "var(--rf-slate)",
  rowHoverColor: "var(--rf-mist)",
  oddRowBackgroundColor: "var(--rf-mist)",
});

export interface ReviewRow {
  group: string;
  kind: "ring" | "pair";
  senderItemId: string;
  receiver: string;
  amount: number;
  reasons: string;
  holdExpiresAt: string;
}

const formatMoney = ({ value }: ValueFormatterParams<ReviewRow>) =>
  typeof value === "number" ? value.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "";
const formatExpiry = ({ value }: ValueFormatterParams<ReviewRow>) =>
  typeof value === "string"
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : "";

const defaultColDef: ColDef<ReviewRow> = { filter: true, resizable: true };
const autoSizeStrategy = { type: "fitCellContents" } as const;

function groupCellClass({ data }: { data?: ReviewRow }) {
  return data?.kind === "ring" ? "font-mono font-medium" : "font-mono text-rf-slate";
}

export function ReviewGrid({ rows }: { rows: ReviewRow[] }) {
  const columns = useMemo<ColDef<ReviewRow>[]>(
    () => [
      {
        field: "group",
        headerName: "Ring / pair",
        cellClass: groupCellClass,
        comparator: (a: string, b: string) => a.localeCompare(b),
      },
      { field: "senderItemId", headerName: "Item", cellClass: "font-mono text-rf-slate" },
      { field: "receiver", headerName: "Payee" },
      { field: "amount", headerName: "Amount", valueFormatter: formatMoney, cellClass: "font-mono" },
      {
        field: "holdExpiresAt",
        headerName: "Simulated expiry · 7-day policy",
        valueFormatter: formatExpiry,
        comparator: (a: string, b: string) => Date.parse(a) - Date.parse(b),
        sort: "asc",
        sortIndex: 0,
        cellClass: "font-mono text-rf-slate",
      },
      { field: "reasons", headerName: "Why it's held", flex: 2 },
    ],
    [],
  );

  return (
    <div className="min-h-0 flex-1 p-1">
      <AgGridProvider modules={modules}>
        <AgGridReact<ReviewRow>
          theme={theme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          autoSizeStrategy={autoSizeStrategy}
          getRowId={({ data }) => data.senderItemId}
          enableCellTextSelection
          overlayNoRowsTemplate='<div class="rf-grid-empty"><strong>Nothing needs review.</strong><span>New holds will appear here after a run.</span></div>'
        />
      </AgGridProvider>
    </div>
  );
}
