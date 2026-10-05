import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { getReportDefinition } from "@/lib/reports/catalog";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";

import { exportReportCsv, logReportPrint } from "../reports/actions";
import { setClockInSelfieRequired } from "./actions";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function HrAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("hr_administrator");
  const raw = await searchParams;
  const filters = parseReportFilters(raw);
  const slug = "attendance-summary" as const;
  const definition = getReportDefinition(slug)!;

  const [{ branches, departments }, result, entitlements] = await Promise.all([
    loadReportFilterOptions(),
    runReport(slug, filters),
    getEntitlements(),
  ]);

  const hasLocation = entitlements.hasModule("location");
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("require_clock_in_selfie")
    .eq("id", await requireOrganizationId())
    .maybeSingle();
  const selfieOn = Boolean(org?.require_clock_in_selfie);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={setClockInSelfieRequired}>
              <input name="enabled" type="hidden" value={selfieOn ? "false" : "true"} />
              <button className="text-xs underline" type="submit">
                {selfieOn ? "Turn off selfie clock-in" : "Require selfie on clock-in"}
              </button>
            </form>
            <HrLinkButton href="/hr/reports/attendance-daily" variant="outline">
              Daily log
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/rosters" variant="outline">
              Rosters
            </HrLinkButton>
          </div>
        }
        description="Attendance rollups by employee. Geofence and roster scheduling are Professional features."
        title="Attendance"
      />

      {!hasLocation ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-secondary)]">
          Upgrade to Professional for geofenced clock-in validation and roster-based attendance.
        </p>
      ) : null}

      <ReportFilterBar
        branches={branches}
        definition={definition}
        departments={departments}
        filters={filters}
      />
      <ReportRunner
        basePath="/hr/attendance"
        columns={result.columns}
        description={definition.description}
        exportCsvAction={exportReportCsv}
        filterSummary={buildFilterSummary(filters)}
        filters={filters}
        logPrintAction={logReportPrint}
        rows={result.rows}
        slug={slug}
        title="Attendance summary"
        total={result.total}
      />
    </div>
  );
}
