import type { CalendarDayEvent } from "@hrms/domain";

import { calendarMonthBounds } from "@hrms/domain";

import { CalendarEventChip } from "@/components/calendar/calendar-event-chip";
import { CalendarLegend } from "@/components/calendar/calendar-legend";

export function CalendarPrintLayout({
  title,
  year,
  month,
  events,
}: {
  title: string;
  year: number;
  month: number;
  events: CalendarDayEvent[];
}) {
  const { weeks } = calendarMonthBounds(year, month);
  const eventsByDate = new Map<string, CalendarDayEvent[]>();
  for (const event of events) {
    const bucket = eventsByDate.get(event.date) ?? [];
    bucket.push(event);
    eventsByDate.set(event.date, bucket);
  }

  const label = new Date(year, month - 1, 1).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hidden print:block">
      <div className="mb-4 space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{label}</p>
        <CalendarLegend showCompanyEvents />
      </div>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((date) => (
                <td className="align-top border border-border p-1" key={date}>
                  <div className="font-medium">{date.slice(8)}</div>
                  <div className="mt-1 space-y-0.5">
                    {(eventsByDate.get(date) ?? []).map((event) => (
                      <CalendarEventChip event={event} key={event.id} />
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
