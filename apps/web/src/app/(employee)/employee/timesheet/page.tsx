import { ListCard } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listRecentAttendance } from "@/lib/employee/attendance";

export default async function Page() {
  const rows = await listRecentAttendance(30);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Your attendance history." title="Timesheet" />

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "in", label: "In", className: "flex-1" },
          { key: "out", label: "Out", className: "flex-1" },
        ]}
        header={<p className="text-sm font-medium">Last 30 days</p>}
        rows={rows.map((row) => ({
          id: row.work_date,
          cells: {
            date: row.work_date,
            in: formatDateTime(row.clock_in_at),
            out: formatDateTime(row.clock_out_at),
          },
        }))}
      />
    </div>
  );
}
