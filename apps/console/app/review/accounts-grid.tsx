"use client";

// "Accounts in this group", the Decisions page's member table. Rendered by AG Grid (the sponsor
// grid), themed down to look like the designer's plain table: no column lines, 52px rows, small grey
// headers, mono values, and a quiet pill button to release one account.
import { CellStyleModule, ClientSideRowModelModule, themeQuartz, type ColDef } from "ag-grid-community";
import { AgGridProvider, AgGridReact, type CustomCellRendererProps } from "ag-grid-react";

const modules = [ClientSideRowModelModule, CellStyleModule];

export const tableTheme = themeQuartz.withParams({
  fontFamily: "var(--font-sans)",
  cellFontFamily: "var(--font-mono)",
  fontSize: 14,
  dataFontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 500,
  headerTextColor: "var(--rf-slate)",
  headerBackgroundColor: "var(--rf-white)",
  backgroundColor: "var(--rf-white)",
  foregroundColor: "var(--rf-ink)",
  borderColor: "var(--rf-hairline)",
  accentColor: "var(--rf-ink)",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  columnBorder: false,
  headerColumnBorder: false,
  headerColumnResizeHandleColor: "transparent",
  rowBorder: true,
  rowHeight: 52,
  headerHeight: 40,
  cellHorizontalPadding: 12,
  rowHoverColor: "var(--rf-mist)",
  oddRowBackgroundColor: "var(--rf-white)",
});

export interface AccountRow {
  key: string;
  status: string;
  released: boolean;
  account: string;
  /** Two short lines each, so seven columns fit the Decisions detail without scrolling. */
  signedUp: [string, string];
  device: [string, string];
  payout: string;
  amount: string;
  canAct: boolean;
}

function TwoLines({ value }: CustomCellRendererProps<AccountRow, [string, string]>) {
  if (!value) return null;
  return (
    <span className="flex h-full flex-col justify-center leading-[1.3]">
      <span className="font-sans text-[13px]">{value[0]}</span>
      <span className="text-xs text-rf-slate">{value[1]}</span>
    </span>
  );
}

function StatusCell({ data }: CustomCellRendererProps<AccountRow>) {
  if (!data) return null;
  return (
    <span className="inline-flex items-center gap-2 font-sans text-[13px] font-medium">
      <span className={`size-2 rounded-full border-[1.5px] border-rf-ink ${data.released ? "bg-rf-ink" : "bg-rf-white"}`} />
      {data.status}
    </span>
  );
}

export function AccountsGrid({ rows, onToggle, showAction }: { rows: AccountRow[]; onToggle: (key: string) => void; showAction: boolean }) {
  const columns: ColDef<AccountRow>[] = [
    { headerName: "Status", field: "status", width: 124, cellRenderer: StatusCell, cellClass: "pl-5!", headerClass: "pl-5!" },
    { headerName: "Account", field: "account", width: 72 },
    { headerName: "Signed up", field: "signedUp", width: 104, cellRenderer: TwoLines },
    { headerName: "Device", field: "device", width: 132, cellRenderer: TwoLines },
    { headerName: "Payout linked to", field: "payout", flex: 1, minWidth: 180 },
    { headerName: "Amount", field: "amount", width: 80, type: "rightAligned" },
    ...(showAction ? [{
      headerName: "", colId: "action", width: 110, sortable: false, cellClass: "flex! items-center justify-end pr-4!",
      cellRenderer: ({ data }: CustomCellRendererProps<AccountRow>) => data?.canAct ? (
        <button type="button" onClick={() => onToggle(data.key)} className="h-9 whitespace-nowrap rounded-full border border-rf-hairline bg-rf-white px-3.5 font-sans text-[13px] leading-none text-rf-ink hover:bg-rf-mist">
          {data.released ? "Undo release" : "Release"}
        </button>
      ) : null,
    } satisfies ColDef<AccountRow>] : []),
  ];
  return (
    <div className="overflow-x-auto">
      <div className="min-w-180">
        <AgGridProvider modules={modules}>
          <AgGridReact<AccountRow>
            theme={tableTheme}
            rowData={rows}
            columnDefs={columns}
            // cellDataType: false - the two-line columns hold pairs, rendered by TwoLines, not formatted values.
            defaultColDef={{ sortable: false, resizable: false, suppressMovable: true, cellDataType: false }}
            getRowId={({ data }) => data.key}
            domLayout="autoHeight"
            suppressCellFocus
            enableCellTextSelection
          />
        </AgGridProvider>
      </div>
    </div>
  );
}
