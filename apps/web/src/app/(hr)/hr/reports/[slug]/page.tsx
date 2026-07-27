import { notFound } from "next/navigation";

import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { getReportDefinition } from "@/lib/reports/catalog";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";
import { isReportSlug } from "@/lib/reports/types";

import { exportReportCsv, logReportPrint } from "../actions";

export default async function HrReportSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        actions={<HrLinkButton href="/hr/reports" variant="outline">Back to hub</HrLinkButton>}
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
        basePath="/hr/reports"
        columns={result.columns}
        description={definition.description}
        exportCsvAction={exportReportCsv}
        filterSummary={buildFilterSummary(filters)}
        filters={filters}
        logPrintAction={logReportPrint}
        rows={result.rows}
        slug={slug}
        title={definition.title}
        total={result.total}
      />
    </div>
  );
}
