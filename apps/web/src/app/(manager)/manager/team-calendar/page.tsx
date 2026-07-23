import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamCalendarEvents } from "@/lib/manager/calendar";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const events = await listTeamCalendarEvents().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Upcoming leave for your direct reports (next 60 days)."
        title="Team calendar"
      />

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "leave", label: "Leave" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={<EmptyState description="No upcoming leave on the calendar." title="Clear schedule" />}
        header={<p className="text-sm font-medium">Leave schedule ({events.length})</p>}
        rows={events.map((event) => ({
          id: event.id,
          cells: {
            employee: event.employeeName,
            leave: `${event.title} · ${event.startDate} → ${event.endDate}`,
            status: (
              <StatusPill
                label={event.status}
                tone={event.status === "approved" ? "success" : "warning"}
              />
            ),
          },
        }))}
      />
    </div>
  );
}
