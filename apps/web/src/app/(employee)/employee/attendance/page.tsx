import { ListCard } from "@hrms/ui";

import { AttendanceClockPanel } from "@/components/employee/attendance-clock-panel";
import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getEmployeeAttendanceContext } from "@/lib/employee/attendance-context";
import { getTodayAttendance, listRecentAttendance } from "@/lib/employee/attendance";

export default async function Page() {
  const [today, recent, attendanceContext] = await Promise.all([
    getTodayAttendance(),
    listRecentAttendance(),
    getEmployeeAttendanceContext(),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Clock in and out for today's shift." title="Attendance" />

      <AttendanceClockPanel
        geofence={attendanceContext.geofence}
        locationModuleEnabled={attendanceContext.locationModuleEnabled}
        today={today}
      />

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "in", label: "Clock in", className: "hidden sm:block flex-1" },
          { key: "out", label: "Clock out", className: "hidden sm:block flex-1" },
          { key: "status", label: "Status", className: "w-24" },
        ]}
        empty={
          <p className="p-6 text-sm text-[var(--foreground-secondary)]">No attendance history yet.</p>
        }
        header={<p className="text-sm font-medium">Recent attendance</p>}
        rows={recent.map((row) => ({
          id: row.id,
          cells: {
            date: row.work_date,
            in: formatDateTime(row.clock_in_at),
            out: formatDateTime(row.clock_out_at),
            status: row.status ?? "—",
          },
        }))}
      />
    </div>
  );
}
