"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPortalMonth, type DisplayCountry } from "@/lib/locale";

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
  country,
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
  country?: DisplayCountry | null;
}) {
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = new Date();
  const monthHref = (y: number, m: number) =>
    buildMonthHref ? buildMonthHref(y, m) : `${basePath}?year=${y}&month=${m}`;
  const label = formatPortalMonth(new Date(year, month - 1, 1), country);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button render={<Link href={monthHref(prev.year, prev.month)} />} size="sm" variant="outline">
          Prev
        </Button>
        <Button
          render={<Link href={monthHref(now.getFullYear(), now.getMonth() + 1)} />}
          size="sm"
          variant="outline"
        >
          Today
        </Button>
        <Button render={<Link href={monthHref(next.year, next.month)} />} size="sm" variant="outline">
          Next
        </Button>
        <h2 className="text-base font-semibold text-[var(--foreground-primary)] sm:text-lg">{label}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {extraActions}
        <Button
          onClick={() => onViewChange("month")}
          size="sm"
          type="button"
          variant={view === "month" ? "default" : "outline"}
        >
          Month
        </Button>
        <Button
          onClick={() => onViewChange("agenda")}
          size="sm"
          type="button"
          variant={view === "agenda" ? "default" : "outline"}
        >
          List
        </Button>
        {onPrint ? (
          <Button onClick={onPrint} size="sm" type="button" variant="outline">
            Print
          </Button>
        ) : null}
        {showExport && onExportCsv ? (
          <Button onClick={onExportCsv} size="sm" type="button" variant="outline">
            Export CSV
          </Button>
        ) : null}
      </div>
    </div>
  );
}
