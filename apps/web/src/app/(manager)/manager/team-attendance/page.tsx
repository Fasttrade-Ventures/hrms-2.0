import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate, formatDateTime } from "@/components/employee/employee-shared";
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
          { key: "employee", label: "Employee", className: "min-w-[160px] flex-1 font-semibold text-[var(--foreground-primary)]" },
          { key: "date", label: "Date", className: "hidden sm:block w-32" },
          { key: "clockIn", label: "Clock in", className: "w-48 sm:w-52 text-left" },
          { key: "clockOut", label: "Clock out", className: "hidden md:block w-64" },
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
            date: <span className="whitespace-nowrap">{formatDate(row.workDate)}</span>,
            clockIn: (
              <span className="whitespace-nowrap">
                {row.clockInAt ? formatDateTime(row.clockInAt) : "—"}
              </span>
            ),
            clockOut: row.clockOutAt ? (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span>{formatDateTime(row.clockOutAt)}</span>
                {row.isAutoClockOut && (
                  <span
                    title="Auto clocked out at shift end"
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 uppercase tracking-tight shrink-0 select-none"
                  >
                    Auto
                  </span>
                )}
              </div>
            ) : (
              "—"
            ),
          },
        }))}
      />
    </div>
  );
}
