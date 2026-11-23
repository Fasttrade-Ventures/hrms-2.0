import { EmptyState } from "@hrms/ui";

import { AttendanceMatrix } from "@/components/hr/attendance/attendance-matrix";
import { TeamAttendanceFilterBar } from "@/components/manager/team-attendance-filter-bar";
import { TeamDocumentsLink } from "@/components/manager/team-documents-link";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { listTeamAttendanceMatrixData, listTeamMembers } from "@/lib/manager/team";
import { parseReportFilters } from "@/lib/reports/filters";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("manager");
  const raw = await searchParams;
  const filters = parseReportFilters(raw);

  const [reports, matrixData] = await Promise.all([
    listTeamMembers().catch(() => []),
    listTeamAttendanceMatrixData(filters).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<TeamDocumentsLink />}
        description="Employee × day timesheet for your direct reports — leave, holidays, and hours."
        title="Team Attendance"
      />

      <TeamAttendanceFilterBar filters={filters} />

      {!reports.length ? (
        <EmptyState
          description="Assign direct reports in HR to see team attendance here."
          icon={<PortalIcon name="team-attendance" className="h-6 w-6" />}
          title="No direct reports"
        />
      ) : matrixData ? (
        <AttendanceMatrix data={matrixData} />
      ) : (
        <EmptyState
          description="Could not load attendance for this date range. Try again or adjust filters."
          icon={<PortalIcon name="team-attendance" className="h-6 w-6" />}
          title="No matrix data"
        />
      )}
    </div>
  );
}
