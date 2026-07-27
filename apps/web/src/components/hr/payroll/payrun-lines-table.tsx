"use client";

import type { CSSProperties, ReactNode } from "react";

import { EditLineDialog } from "@/components/hr/payroll/edit-line-dialog";
import type { PayrunLineItem } from "@/lib/payroll/queries";
import { cn } from "@/lib/utils";

function formatAmount(value: string | number) {
  return Number(value).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const NUMERIC_COLUMN_KEYS = new Set([
  "gross",
  "basicEdit",
  "epf",
  "socso",
  "eis",
  "pcb",
  "hrdf",
  "net",
]);

type ColumnDef = { key: string; label: string; align?: "left" | "right" };

function getColumns(editable: boolean): ColumnDef[] {
  const columns: ColumnDef[] = [
    { key: "employee", label: "Employee", align: "left" },
    { key: "gross", label: "Gross", align: "right" },
  ];

  if (editable) {
    columns.push({ key: "basicEdit", label: "Basic (RM)", align: "right" });
  }

  columns.push(
    { key: "epf", label: "EPF", align: "right" },
    { key: "socso", label: "SOCSO", align: "right" },
    { key: "eis", label: "EIS", align: "right" },
    { key: "pcb", label: "PCB", align: "right" },
    { key: "hrdf", label: "HRDF", align: "right" },
    { key: "net", label: "Net", align: "right" },
  );

  return columns;
}

function getGridStyle(editable: boolean): CSSProperties {
  return {
    gridTemplateColumns: editable
      ? "minmax(11rem, 2.4fr) repeat(8, minmax(4.5rem, 1fr))"
      : "minmax(11rem, 2.4fr) repeat(7, minmax(4.5rem, 1fr))",
  };
}

function GridRow({
  editable,
  compact,
  className,
  children,
}: {
  editable: boolean;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid w-full items-center gap-x-3 px-4",
        compact ? "py-2.5" : "py-3.5",
        className,
      )}
      style={getGridStyle(editable)}
    >
      {children}
    </div>
  );
}

function GridCell({
  columnKey,
  align,
  className,
  children,
}: {
  columnKey: string;
  align?: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const textAlign = align ?? (NUMERIC_COLUMN_KEYS.has(columnKey) ? "right" : "left");

  return (
    <div
      className={cn(
        "min-w-0",
        textAlign === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </div>
  );
}

function StatutoryCell({
  employee,
  employer,
}: {
  employee: string | number;
  employer: string | number;
}) {
  return (
    <div className="inline-flex flex-col items-end space-y-0.5 text-xs tabular-nums leading-tight">
      <div>
        <span className="mr-1 text-[10px] font-medium uppercase text-muted-foreground">EE</span>
        {formatAmount(employee)}
      </div>
      <div>
        <span className="mr-1 text-[10px] font-medium uppercase text-muted-foreground">ER</span>
        {formatAmount(employer)}
      </div>
    </div>
  );
}

function EmployeeCell({ item }: { item: PayrunLineItem }) {
  return (
    <div className="min-w-0 pr-2">
      <p
        className={cn(
          "truncate text-sm font-medium",
          item.requiresResolution && "text-amber-700",
        )}
        title={`${item.employeeNumber} · ${item.employeeName}`}
      >
        {item.employeeName}
        {item.requiresResolution ? " ⚠" : ""}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {item.employeeNumber}
        {item.branchName ? ` · ${item.branchName}` : ""}
      </p>
    </div>
  );
}

function buildRowCells(
  item: PayrunLineItem,
  options: { editable: boolean; payrunId?: string },
) {
  const basicAmount = Number(item.basicPay ?? item.grossPay);

  const cells: Record<string, ReactNode> = {
    employee: <EmployeeCell item={item} />,
    gross: <span className="text-xs tabular-nums">{formatAmount(item.grossPay)}</span>,
    epf: <StatutoryCell employee={item.epfEmployee} employer={item.epfEmployer} />,
    socso: <StatutoryCell employee={item.socsoEmployee} employer={item.socsoEmployer} />,
    eis: <StatutoryCell employee={item.eisEmployee} employer={item.eisEmployer} />,
    pcb: <span className="text-xs tabular-nums">{formatAmount(item.pcb)}</span>,
    hrdf: <span className="text-xs tabular-nums">{formatAmount(item.hrdfEmployer)}</span>,
    net: <span className="text-sm font-medium tabular-nums">{formatAmount(item.netPay)}</span>,
  };

  if (options.editable) {
    cells.basicEdit = (
      <div className="flex justify-end">
        <EditLineDialog
          componentCode="BASIC"
          currentAmount={basicAmount}
          payrunId={options.payrunId}
          payrunItemId={item.id}
        />
      </div>
    );
  }

  return cells;
}

function sumField(items: PayrunLineItem[], field: keyof PayrunLineItem) {
  return items.reduce((total, item) => total + Number(item[field]), 0);
}

export function PayrunLinesTable({
  items,
  editable = false,
  payrunId,
}: {
  items: PayrunLineItem[];
  editable?: boolean;
  payrunId?: string;
}) {
  const columns = getColumns(editable);
  const totals = {
    gross: sumField(items, "grossPay"),
    epfEmployee: sumField(items, "epfEmployee"),
    epfEmployer: sumField(items, "epfEmployer"),
    socsoEmployee: sumField(items, "socsoEmployee"),
    socsoEmployer: sumField(items, "socsoEmployer"),
    eisEmployee: sumField(items, "eisEmployee"),
    eisEmployer: sumField(items, "eisEmployer"),
    pcb: sumField(items, "pcb"),
    hrdfEmployer: sumField(items, "hrdfEmployer"),
    net: sumField(items, "netPay"),
  };

  const totalsCells: Record<string, ReactNode> = {
    employee: (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Totals</span>
    ),
    gross: <span className="text-xs font-semibold tabular-nums">{formatAmount(totals.gross)}</span>,
    epf: <StatutoryCell employee={totals.epfEmployee} employer={totals.epfEmployer} />,
    socso: <StatutoryCell employee={totals.socsoEmployee} employer={totals.socsoEmployer} />,
    eis: <StatutoryCell employee={totals.eisEmployee} employer={totals.eisEmployer} />,
    pcb: <span className="text-xs font-semibold tabular-nums">{formatAmount(totals.pcb)}</span>,
    hrdf: <span className="text-xs font-semibold tabular-nums">{formatAmount(totals.hrdfEmployer)}</span>,
    net: <span className="text-sm font-semibold tabular-nums">{formatAmount(totals.net)}</span>,
    basicEdit: null,
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Employee lines ({items.length})</p>
            {editable ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Draft · editable
              </span>
            ) : null}
          </div>
          <div className="text-right">
            {editable ? (
              <p className="text-xs text-muted-foreground">
                Change basic salary in the <span className="font-medium text-foreground">Basic</span>{" "}
                column.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">EE = employee · ER = employer</p>
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="w-full">
          <GridRow
            className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)]/60"
            compact
            editable={editable}
          >
            {columns.map((column) => (
              <GridCell columnKey={column.key} key={column.key} align={column.align}>
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
                  {column.label}
                </span>
              </GridCell>
            ))}
          </GridRow>

          <div className="divide-y divide-[var(--border-primary)]">
            {items.map((item) => {
              const cells = buildRowCells(item, { editable, payrunId });
              return (
                <GridRow compact={editable} editable={editable} key={item.id}>
                  {columns.map((column) => (
                    <GridCell columnKey={column.key} key={column.key} align={column.align}>
                      {cells[column.key]}
                    </GridCell>
                  ))}
                </GridRow>
              );
            })}
          </div>

          <GridRow
            className="border-t border-[var(--border-primary)] bg-[var(--surface-muted)]/50"
            compact
            editable={editable}
          >
            {columns.map((column) => (
              <GridCell columnKey={column.key} key={column.key} align={column.align}>
                {totalsCells[column.key]}
              </GridCell>
            ))}
          </GridRow>
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-[var(--foreground-muted)]">No rows to display.</p>
      )}
    </div>
  );
}
