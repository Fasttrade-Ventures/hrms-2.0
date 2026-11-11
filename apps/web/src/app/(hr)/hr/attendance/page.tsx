import { AttendanceMatrix } from "@/components/hr/attendance/attendance-matrix";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalFilterChip, PortalFilterChips } from "@/components/portal/portal-filter-chips";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { ReportRunner } from "@/components/reports/report-runner";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { getOrganizationCountry } from "@/lib/hr/organization";
import { getReportDefinition } from "@/lib/reports/catalog";
import { listAttendanceMatrixData } from "@/lib/reports/attendance-matrix";
import { buildFilterSummary, loadReportFilterOptions } from "@/lib/reports/context";
import { buildReportSearchParams, parseReportFilters } from "@/lib/reports/filters";
import { runReport } from "@/lib/reports/run";
import { createAdminClient } from "@/lib/supabase/admin";

import { exportReportCsv, logReportPrint } from "../reports/actions";
import { setClockInSelfieRequired } from "./actions";

function attendanceHref(
  view: "matrix" | "summary",
  filters: ReturnType<typeof parseReportFilters>,
): string {
  const params = buildReportSearchParams(filters, view === "summary" ? filters.page : 1);
  if (view === "summary") params.set("view", "summary");
  const qs = params.toString();
  return qs ? `/hr/attendance?${qs}` : "/hr/attendance";
}

export default async function HrAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("hr_administrator");
  const country = await getOrganizationCountry();
  const raw = await searchParams;
  const filters = parseReportFilters(raw);
  const viewParam = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  const view = viewParam === "summary" ? "summary" : "matrix";
  const slug = "attendance-summary" as const;
  const definition = getReportDefinition(slug)!;

  const [{ branches, departments }, entitlements, summaryResult, matrixData] = await Promise.all([
    loadReportFilterOptions(),
    getEntitlements(),
    view === "summary" ? runReport(slug, filters) : Promise.resolve(null),
    view === "matrix" ? listAttendanceMatrixData(filters) : Promise.resolve(null),
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
        description="Employee × day timesheet with leave and holidays. Switch to Summary for rollups and CSV."
        title="Attendance"
      />

      {!hasLocation ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-secondary)]">
          Upgrade to Professional for geofenced clock-in validation and roster-based attendance.
        </p>
      ) : null}

      <PortalFilterChips>
        <PortalFilterChip active={view === "matrix"} href={attendanceHref("matrix", filters)}>
          Matrix
        </PortalFilterChip>
        <PortalFilterChip active={view === "summary"} href={attendanceHref("summary", filters)}>
          Summary
        </PortalFilterChip>
      </PortalFilterChips>

      <ReportFilterBar
        branches={branches}
        definition={definition}
        departments={departments}
        filters={filters}
        preserveParams={view === "summary" ? { view: "summary" } : undefined}
      />

      {view === "matrix" && matrixData ? <AttendanceMatrix data={matrixData} /> : null}

      {view === "summary" && summaryResult ? (
        <ReportRunner
          basePath="/hr/attendance"
          country={country}
          columns={summaryResult.columns}
          description={definition.description}
          exportCsvAction={exportReportCsv}
          filterSummary={buildFilterSummary(filters)}
          filters={filters}
          hrefExtra={{ view: "summary" }}
          logPrintAction={logReportPrint}
          paginationPath="/hr/attendance"
          rows={summaryResult.rows}
          slug={slug}
          title="Attendance summary"
          total={summaryResult.total}
        />
      ) : null}
    </div>
  );
}
