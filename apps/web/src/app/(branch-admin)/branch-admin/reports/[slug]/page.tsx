import { notFound } from "next/navigation";

import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getReportDefinition } from "@/lib/reports/catalog";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";
import { isReportSlug } from "@/lib/reports/types";

import { exportBranchReportCsv, logBranchReportPrint } from "../actions";

const BRANCH_REPORT_SLUGS = new Set([
  "leave-balances",
  "leave-usage",
  "attendance-daily",
  "attendance-summary",
  "headcount",
  "document-compliance",
]);

export default async function BranchReportSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireBranchAdminContext();
  const { slug } = await params;
  if (!isReportSlug(slug) || !BRANCH_REPORT_SLUGS.has(slug)) notFound();

  const definition = getReportDefinition(slug);
  if (!definition) notFound();

  const raw = await searchParams;
  const filters = {
    ...parseReportFilters(raw),
    branchId: context.branchId,
  };
  const [{ departments }, result] = await Promise.all([
    loadReportFilterOptions(),
    runReport(slug, filters),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/branch-admin/reports" variant="outline">
            Back to hub
          </HrLinkButton>
        }
        description={`${definition.description} · ${context.branchName}`}
        title={definition.title}
      />
      <ReportFilterBar
        branches={[{ id: context.branchId, name: context.branchName }]}
        definition={definition}
        departments={departments}
        filters={filters}
      />
      <ReportRunner
        basePath="/branch-admin/reports"
        columns={result.columns}
        description={definition.description}
        exportCsvAction={exportBranchReportCsv}
        filterSummary={buildFilterSummary(filters)}
        filters={filters}
        logPrintAction={logBranchReportPrint}
        rows={result.rows}
        slug={slug}
        title={definition.title}
        total={result.total}
      />
    </div>
  );
}
