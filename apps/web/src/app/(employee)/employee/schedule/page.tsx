import { ListCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listEmployeeRosterSchedule } from "@/lib/hr/rosters";

export default async function EmployeeSchedulePage() {
  const entries = await listEmployeeRosterSchedule(14);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Your assigned shifts for the next two weeks."
        title="My schedule"
      />

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "shift", label: "Shift" },
          { key: "hours", label: "Hours" },
          { key: "notes", label: "Notes" },
        ]}
        empty={
          <p className="p-6 text-sm text-[var(--foreground-secondary)]">
            No roster assignments yet. HR will publish your schedule here.
          </p>
        }
        header={<p className="text-sm font-medium">Upcoming shifts</p>}
        rows={entries.map((entry) => ({
          id: entry.id,
          cells: {
            date: entry.workDate,
            shift: entry.shiftName,
            hours: `${entry.shiftStart.slice(0, 5)}–${entry.shiftEnd.slice(0, 5)}`,
            notes: entry.notes ?? "—",
          },
        }))}
      />
    </div>
  );
}
