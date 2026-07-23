import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamLeave } from "@/lib/manager/team";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const rows = await listTeamLeave().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Leave requests from your direct reports." title="Team leave" />

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "details", label: "Details" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={<EmptyState description="Assign direct reports in HR to see team leave here." title="No team leave" />}
        header={<p className="text-sm font-medium">Requests ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.id,
          cells: {
            employee: row.employeeName,
            details: `${row.leaveTypeName} · ${row.startDate} → ${row.endDate} · ${row.days} day(s)`,
            status: (
              <StatusPill
                label={row.status}
                tone={row.status === "approved" ? "success" : row.status === "pending" ? "warning" : "neutral"}
              />
            ),
          },
        }))}
      />
    </div>
  );
}
