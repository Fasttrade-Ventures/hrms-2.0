import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamPerformance } from "@/lib/manager/performance";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const rows = await listTeamPerformance().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Performance appraisals for your direct reports."
        title="Team performance"
      />

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "cycle", label: "Cycle" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="Appraisal cycles will appear here when HR creates review cycles."
            title="No appraisals"
          />
        }
        header={<p className="text-sm font-medium">Appraisals ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.id,
          cells: {
            employee: row.employeeName,
            cycle: [
              row.cycleName,
              row.selfRating != null ? `Self ${row.selfRating}/5` : null,
              row.managerRating != null ? `Manager ${row.managerRating}/5` : null,
            ]
              .filter(Boolean)
              .join(" · "),
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
