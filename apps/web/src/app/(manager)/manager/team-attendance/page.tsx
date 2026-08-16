import { EmptyState, ListCard } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { TeamDocumentsLink } from "@/components/manager/team-documents-link";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamAttendance } from "@/lib/manager/team";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const rows = await listTeamAttendance().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<TeamDocumentsLink />}
        description="Recent attendance for your direct reports."
        title="Team Attendance"
      />

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "date", label: "Date", className: "w-32" },
          { key: "clockIn", label: "Clock in", className: "w-40" },
          { key: "clockOut", label: "Clock out", className: "w-40" },
        ]}
        empty={
          <EmptyState
            description="Assign direct reports in HR to see team attendance here."
            icon={<PortalIcon name="team-attendance" className="h-6 w-6" />}
            title="No records"
          />
        }
        header={<p className="text-sm font-medium">Records ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.id,
          cells: {
            employee: row.employeeName,
            date: row.workDate,
            clockIn: row.clockInAt ? formatDateTime(row.clockInAt) : "—",
            clockOut: row.clockOutAt ? formatDateTime(row.clockOutAt) : "—",
          },
        }))}
      />
    </div>
  );
}
