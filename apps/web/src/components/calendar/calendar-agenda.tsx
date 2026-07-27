"use client";

import { useMemo } from "react";

import type { CalendarDayEvent } from "@hrms/domain";

import { formatDateTime } from "@/components/employee/employee-shared";
import { CalendarEventChip } from "@/components/calendar/calendar-event-chip";

export function CalendarAgenda({
  events,
  year,
  month,
  onEventClick,
}: {
  events: CalendarDayEvent[];
  year: number;
  month: number;
  onEventClick: (event: CalendarDayEvent) => void;
}) {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarDayEvent[]>();
    for (const event of events) {
      if (!event.date.startsWith(monthPrefix)) continue;
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events, monthPrefix]);

  if (!grouped.length) {
    return <p className="text-sm text-muted-foreground">No events this month.</p>;
  }

  return (
    <div className="space-y-4">
      {grouped.map(([date, dayEvents]) => (
        <section className="rounded-lg border border-border" key={date}>
          <header className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-medium">
            {formatDateTime(`${date}T00:00:00`)}
          </header>
          <div className="space-y-2 p-3">
            {dayEvents.map((event) => (
              <CalendarEventChip event={event} key={event.id} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
