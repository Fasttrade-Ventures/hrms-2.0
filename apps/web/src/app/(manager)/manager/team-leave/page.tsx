import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { TeamDocumentsLink } from "@/components/manager/team-documents-link";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamLeave } from "@/lib/manager/team";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const rows = await listTeamLeave().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<TeamDocumentsLink />}
        description="Leave requests from your direct reports."
        title="Team Leave"
      />

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "details", label: "Details" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="Assign direct reports in HR to see team leave here."
            icon={<PortalIcon name="team-leave" className="h-6 w-6" />}
            title="No team leave"
          />
        }
        header={<p className="text-sm font-medium">Requests ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.id,
          cells: {
            employee: row.employeeName,
            details: `${row.leaveTypeName} · ${row.startDate} → ${row.endDate} · ${row.days} day(s)`,
            status: (
              <StatusPill
                label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                tone={row.status === "approved" ? "success" : row.status === "pending" ? "warning" : row.status === "rejected" || row.status === "declined" ? "danger" : "neutral"}
              />
            ),
          },
        }))}
      />
    </div>
  );
}
