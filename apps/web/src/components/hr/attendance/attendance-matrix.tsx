"use client";

import { useTransition } from "react";

import { EmptyState } from "@hrms/ui";

import { PortalCard } from "@/components/portal/portal-card";
import { PortalIcon } from "@/components/portal/portal-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AttendanceMatrixData,
  MatrixCell,
  MatrixCellKind,
} from "@/lib/reports/attendance-matrix";

const LEGEND: Array<{ kind: MatrixCellKind | "hours"; label: string; sample: string }> = [
  { kind: "hours", label: "Hours worked", sample: "8.3" },
  { kind: "late", label: "Late", sample: "8.0" },
  { kind: "leave", label: "Approved leave", sample: "AL" },
  { kind: "holiday", label: "Holiday", sample: "HOL" },
  { kind: "absent", label: "Absent", sample: "x" },
];

function cellClass(kind: MatrixCellKind): string {
  switch (kind) {
    case "hours":
      return "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]";
    case "late":
      return "bg-[#fef3c7] text-[#b45309]";
    case "leave":
      return "bg-[var(--surface-muted)] text-[var(--foreground-primary)]";
    case "holiday":
      return "bg-[var(--success-soft)] text-[var(--success)]";
    case "absent":
      return "bg-[var(--danger-soft)] text-[var(--danger)]";
    default:
      return "text-[var(--foreground-muted)]";
  }
}

function CellView({ cell }: { cell: MatrixCell }) {
  if (cell.kind === "empty" || !cell.label) {
    return <span className="text-[var(--foreground-muted)]">·</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.75rem] items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-semibold leading-none",
        cellClass(cell.kind),
      )}
      title={cell.title ?? cell.label}
    >
      {cell.label}
      {cell.kind === "hours" || cell.kind === "late" ? (
        <span className="ml-0.5 text-[9px] font-medium opacity-70">h</span>
      ) : null}
    </span>
  );
}

export function AttendanceMatrix({
  data,
  onPrint,
}: {
  data: AttendanceMatrixData;
  onPrint?: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function handlePrint() {
    startTransition(async () => {
      if (onPrint) await onPrint();
      window.print();
    });
  }

  if (data.rows.length === 0) {
    return (
      <EmptyState
        description="Adjust branch, department, or date filters to see the timesheet."
        icon={<PortalIcon name="attendance" />}
        title="No employees in this range"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground-primary)]">
            Attendance timesheet
          </h2>
          <p className="text-sm text-[var(--foreground-secondary)]">{data.rangeLabel}</p>
        </div>
        <Button disabled={pending} onClick={handlePrint} size="sm" type="button" variant="outline">
          Print / PDF
        </Button>
      </div>

      <div className="hidden print:block">
        <p className="text-lg font-semibold">Attendance timesheet: {data.rangeLabel}</p>
      </div>

      <PortalCard className="overflow-hidden" padding="none">
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="w-max min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-[var(--surface-card)]">
              <tr className="border-b border-[var(--border-primary)]">
                <th className="sticky left-0 z-30 min-w-[180px] bg-[var(--surface-card)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] shadow-[1px_0_0_var(--border-primary)]">
                  Employee
                </th>
                {data.days.map((day) => (
                  <th
                    className={cn(
                      "min-w-[36px] px-1 py-1.5 text-center font-semibold",
                      day.isHoliday && "bg-[var(--success-soft)]/60",
                      day.isWeekend && !day.isHoliday && "bg-[var(--surface-muted)]",
                    )}
                    key={day.date}
                  >
                    <div className="text-[9px] font-medium uppercase text-[var(--foreground-muted)]">
                      {day.weekday}
                    </div>
                    <div className="text-[11px] text-[var(--foreground-primary)]">{day.dayOfMonth}</div>
                  </th>
                ))}
                <th className="sticky right-0 z-30 min-w-[64px] bg-[var(--surface-card)] px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] shadow-[-1px_0_0_var(--border-primary)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  className="border-b border-[var(--border-primary)]/80 hover:bg-[var(--surface-muted)]/40"
                  key={row.employeeId}
                >
                  <td className="sticky left-0 z-10 bg-[var(--surface-card)] px-3 py-2 shadow-[1px_0_0_var(--border-primary)]">
                    <p className="truncate text-[12px] font-semibold text-[var(--foreground-primary)]">
                      {row.employeeName}
                    </p>
                    <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                      {row.employeeNumber}
                      {row.branch ? ` · ${row.branch}` : ""}
                    </p>
                  </td>
                  {data.days.map((day) => (
                    <td
                      className={cn(
                        "px-0.5 py-1.5 text-center align-middle",
                        day.isHoliday && "bg-[var(--success-soft)]/40",
                        day.isWeekend && !day.isHoliday && "bg-[var(--surface-muted)]/70",
                      )}
                      key={`${row.employeeId}-${day.date}`}
                    >
                      <CellView cell={row.cells[day.date] ?? { kind: "empty", label: "" }} />
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 bg-[var(--surface-card)] px-2 py-2 text-right text-[11px] font-semibold text-[var(--foreground-primary)] shadow-[-1px_0_0_var(--border-primary)]">
                    {row.totalHours > 0 ? `${row.totalHours}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalCard>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--foreground-secondary)]">
        <span className="font-semibold text-[var(--foreground-primary)]">Legend</span>
        {LEGEND.map((item) => (
          <span className="inline-flex items-center gap-1.5" key={item.kind}>
            <span
              className={cn(
                "inline-flex min-w-[1.75rem] items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-semibold",
                cellClass(item.kind),
              )}
            >
              {item.sample}
            </span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
