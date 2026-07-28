import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { listOrgPendingApprovals } from "@/lib/hr/operations";
import { getReportDefinition } from "@/lib/reports/catalog";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";

import { exportReportCsv, logReportPrint } from "../reports/actions";

export default async function HrLeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("hr_administrator");
  const raw = await searchParams;
  const filters = parseReportFilters(raw);
  const slug = "leave-balances" as const;
  const definition = getReportDefinition(slug)!;

  const [pendingApprovals, { branches, departments }, result, entitlements] = await Promise.all([
    listOrgPendingApprovals().then((rows) => rows.filter((row) => row.requestType === "leave")),
    loadReportFilterOptions(),
    runReport(slug, filters),
    getEntitlements(),
  ]);

  const isPro = entitlements.tier !== "core";

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <HrLinkButton href="/hr/operations" variant="outline">
              Operations ({pendingApprovals.length} leave)
            </HrLinkButton>
            <HrLinkButton href="/hr/reports/leave-usage" variant="outline">
              Leave usage report
            </HrLinkButton>
            {isPro ? (
              <HrLinkButton href="/hr/organization/leave-blackouts">Blackout periods</HrLinkButton>
            ) : null}
          </div>
        }
        description="Org-wide leave balances and pending approvals. Blackout periods are available on Professional."
        title="Leave"
      />

      {!isPro ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-secondary)]">
          Upgrade to Professional to configure leave blackout periods and scheduled leave reports.
        </p>
      ) : null}

      <ReportFilterBar
        branches={branches}
        definition={definition}
        departments={departments}
        filters={filters}
      />
      <ReportRunner
        basePath="/hr/leave"
        columns={result.columns}
        description={definition.description}
        exportCsvAction={exportReportCsv}
        filterSummary={buildFilterSummary(filters)}
        filters={filters}
        logPrintAction={logReportPrint}
        rows={result.rows}
        slug={slug}
        title="Leave balances"
        total={result.total}
      />
    </div>
  );
}
