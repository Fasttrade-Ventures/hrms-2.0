"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function CalendarToolbar({
  basePath,
  year,
  month,
  view,
  onViewChange,
  onPrint,
  onExportCsv,
  showExport = false,
  extraActions,
  buildMonthHref,
}: {
  basePath: string;
  year: number;
  month: number;
  view: "month" | "agenda";
  onViewChange: (view: "month" | "agenda") => void;
  onPrint?: () => void;
  onExportCsv?: () => void;
  showExport?: boolean;
  extraActions?: React.ReactNode;
  buildMonthHref?: (year: number, month: number) => string;
}) {
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = new Date();
  const monthHref = (y: number, m: number) =>
    buildMonthHref ? buildMonthHref(y, m) : `${basePath}?year=${y}&month=${m}`;
  const label = new Date(year, month - 1, 1).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          href={monthHref(prev.year, prev.month)}
        >
          Prev
        </Link>
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          href={monthHref(now.getFullYear(), now.getMonth() + 1)}
        >
          Today
        </Link>
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          href={monthHref(next.year, next.month)}
        >
          Next
        </Link>
        <h2 className="text-lg font-semibold">{label}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {extraActions}
        <button
          className={cn(buttonVariants({ variant: view === "month" ? "default" : "outline", size: "sm" }))}
          onClick={() => onViewChange("month")}
          type="button"
        >
          Month
        </button>
        <button
          className={cn(buttonVariants({ variant: view === "agenda" ? "default" : "outline", size: "sm" }))}
          onClick={() => onViewChange("agenda")}
          type="button"
        >
          List
        </button>
        {onPrint ? (
          <button
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={onPrint}
            type="button"
          >
            Print
          </button>
        ) : null}
        {showExport && onExportCsv ? (
          <button
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={onExportCsv}
            type="button"
          >
            Export CSV
          </button>
        ) : null}
      </div>
    </div>
  );
}
