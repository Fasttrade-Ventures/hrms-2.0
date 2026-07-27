import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getReportDefinition } from "@/lib/reports/catalog";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";
import { isReportSlug } from "@/lib/reports/types";

import { exportDirectorReportCsv, logDirectorReportPrint } from "../actions";

export default async function DirectorReportSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("director");

  const { slug } = await params;
  if (!isReportSlug(slug)) notFound();

  const definition = getReportDefinition(slug);
  if (!definition) notFound();

  const raw = await searchParams;
  const filters = parseReportFilters(raw);
  const [{ branches, departments }, result] = await Promise.all([
    loadReportFilterOptions(),
    runReport(slug, filters),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Button render={<Link href="/director/reports" />} size="sm" variant="outline">
            Back to hub
          </Button>
        }
        description={definition.description}
        title={definition.title}
      />
      <ReportFilterBar
        branches={branches}
        definition={definition}
        departments={departments}
        filters={filters}
      />
      <ReportRunner
        basePath="/director/reports"
        columns={result.columns}
        description={definition.description}
        exportCsvAction={exportDirectorReportCsv}
        filterSummary={buildFilterSummary(filters)}
        filters={filters}
        logPrintAction={logDirectorReportPrint}
        rows={result.rows}
        slug={slug}
        title={definition.title}
        total={result.total}
      />
    </div>
  );
}
