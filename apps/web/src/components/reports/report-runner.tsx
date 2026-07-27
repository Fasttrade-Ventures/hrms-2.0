"use client";

import { useState, useTransition } from "react";

import { EmptyState } from "@hrms/ui";

import { HrPagination } from "@/components/hr/hr-ui.client";
import { HrBanner, HrTableCard } from "@/components/hr/hr-ui";
import { ReportPrintLayout } from "@/components/reports/report-print-layout";
import { Button } from "@/components/ui/button";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

const EXPORT_ROW_CAP = 5000;

export type ReportColumn = { key: string; label: string };

export function ReportRunner({
  title,
  description,
  slug,
  columns,
  rows,
  total,
  filters,
  filterSummary,
  basePath,
  exportCsvAction,
  logPrintAction,
}: {
  title: string;
  description: string;
  slug: ReportSlug;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  total: number;
  filters: ReportFilters;
  filterSummary: string;
  basePath: string;
  exportCsvAction: (slug: ReportSlug, filters: ReportFilters) => Promise<{ csv: string; filename: string }>;
  logPrintAction: (slug: ReportSlug, filters: ReportFilters) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  const paginationHref = (page: number) => {
    const params = new URLSearchParams();
    if (filters.preset !== "this_month") params.set("preset", filters.preset);
    if (filters.preset === "custom") {
      params.set("from", filters.from);
      params.set("to", filters.to);
    }
    if (filters.asOf) params.set("asOf", filters.asOf);
    if (filters.branchId) params.set("branch", filters.branchId);
    if (filters.departmentId) params.set("department", filters.departmentId);
    if (filters.employmentStatus !== "all") params.set("status", filters.employmentStatus);
    if (filters.employeeQuery) params.set("q", filters.employeeQuery);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}/${slug}?${qs}` : `${basePath}/${slug}`;
  };

  function handleExport() {
    startTransition(async () => {
      setError(null);
      try {
        const { csv, filename } = await exportCsvAction(slug, filters);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    });
  }

  function handlePrint() {
    startTransition(async () => {
      setError(null);
      try {
        await logPrintAction(slug, filters);
        window.print();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Print failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {total > EXPORT_ROW_CAP ? (
        <HrBanner>Export is limited to {EXPORT_ROW_CAP.toLocaleString()} rows. Narrow your filters to export everything.</HrBanner>
      ) : null}

      {error ? <HrBanner>{error}</HrBanner> : null}

      <div className="print:hidden flex flex-wrap gap-2">
        <Button disabled={isPending} onClick={handleExport} size="sm" type="button">
          Download CSV
        </Button>
        <Button disabled={isPending} onClick={handlePrint} size="sm" type="button" variant="outline">
          Print / PDF
        </Button>
      </div>

      <div className="print:hidden">
        <HrTableCard>
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState description="Try adjusting your filters." title="No rows match" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      {columns.map((column) => (
                        <th className="px-4 py-3 font-medium" key={column.key}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr className="border-b" key={index}>
                        {columns.map((column) => (
                          <td className="px-4 py-3" key={column.key}>
                            {row[column.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pageCount > 1 ? (
                <div className="border-t px-4 py-3">
                  <HrPagination
                    from={(filters.page - 1) * filters.pageSize + 1}
                    itemLabel="rows"
                    nextHref={filters.page < pageCount ? paginationHref(filters.page + 1) : undefined}
                    page={filters.page}
                    pageLinks={Array.from({ length: pageCount }, (_, index) => ({
                      page: index + 1,
                      href: paginationHref(index + 1),
                    }))}
                    prevHref={filters.page > 1 ? paginationHref(filters.page - 1) : undefined}
                    to={Math.min(filters.page * filters.pageSize, total)}
                    total={total}
                  />
                </div>
              ) : null}
            </>
          )}
        </HrTableCard>
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {rows.length} of {total.toLocaleString()} rows
        </p>
      </div>

      <ReportPrintLayout columns={columns} filterSummary={filterSummary} rows={rows} title={title} />
    </div>
  );
}
