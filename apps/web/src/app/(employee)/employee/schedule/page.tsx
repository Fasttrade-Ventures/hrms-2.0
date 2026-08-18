import { ListCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listEmployeeRosterSchedule, addDays } from "@/lib/hr/rosters";

export default async function EmployeeSchedulePage() {
  const daysToShow = 14;
  const entries = await listEmployeeRosterSchedule(daysToShow);

  // Generate 14 days starting from today in YYYY-MM-DD format
  const start = new Date().toISOString().slice(0, 10);
  const dates: string[] = [];
  let current = start;
  for (let i = 0; i < daysToShow; i++) {
    dates.push(current);
    current = addDays(current, 1);
  }

  const formatHours = (startTime: string, endTime: string) => {
    if (startTime === "—" || endTime === "—") return "—";
    return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
  };

  const rows = dates.map((date) => {
    const entry = entries.find((e) => e.workDate === date);
    const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (entry) {
      return {
        id: date,
        cells: {
          date: <span className="font-semibold text-[var(--foreground-primary)]">{dateLabel}</span>,
          shift: (
            <span className="inline-flex items-center rounded-md bg-[var(--surface-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/10">
              {entry.shiftName}
            </span>
          ),
          hours: formatHours(entry.shiftStart, entry.shiftEnd),
          notes: entry.notes ?? "—",
        },
      };
    } else {
      return {
        id: date,
        cells: {
          date: <span className="text-[var(--foreground-secondary)]">{dateLabel}</span>,
          shift: (
            <span className="inline-flex items-center rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground-muted)] border border-[var(--border-primary)]">
              Off Day
            </span>
          ),
          hours: <span className="text-[var(--foreground-muted)]">—</span>,
          notes: <span className="text-[var(--foreground-muted)]">—</span>,
        },
      };
    }
  });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Your assigned shifts for the next two weeks."
        title="My Schedule"
      />

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "shift", label: "Shift" },
          { key: "hours", label: "Hours" },
          { key: "notes", label: "Notes" },
        ]}
        header={<p className="text-sm font-semibold text-[var(--foreground-primary)]">Upcoming shifts & off days</p>}
        rows={rows}
      />
    </div>
  );
}
