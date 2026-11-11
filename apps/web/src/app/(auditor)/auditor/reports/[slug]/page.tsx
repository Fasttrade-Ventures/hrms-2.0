import { notFound } from "next/navigation";

import { exportReportCsv, logReportPrint } from "@/app/(hr)/hr/reports/actions";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { ReportSubscriptionPanel } from "@/components/reports/report-subscription-panel";
import { getEntitlements } from "@/lib/entitlements";
import { getOrganizationCountry } from "@/lib/hr/organization";
import { getReportDefinition } from "@/lib/reports/catalog";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";
import { isReportSlug } from "@/lib/reports/types";

export default async function AuditorReportSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const country = await getOrganizationCountry();
  if (!isReportSlug(slug)) notFound();

  const definition = getReportDefinition(slug);
  if (!definition) notFound();

  const raw = await searchParams;
  const filters = parseReportFilters(raw);
  const [{ branches, departments }, result, entitlements] = await Promise.all([
    loadReportFilterOptions(),
    runReport(slug, filters),
    getEntitlements(),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/auditor/reports" variant="outline">
            Back to hub
          </HrLinkButton>
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
      <ReportSubscriptionPanel
        enabled={entitlements.tier !== "core"}
        filters={filters}
        slug={slug}
      />
      <ReportRunner
        basePath="/auditor/reports"
        country={country}
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
