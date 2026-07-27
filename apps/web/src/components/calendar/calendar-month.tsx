"use client";

import Link from "next/link";
import { useMemo } from "react";

import { calendarMonthBounds, isWeekendDate, type CalendarDayEvent } from "@hrms/domain";

import { CalendarEventChip } from "@/components/calendar/calendar-event-chip";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonth({
  events,
  year,
  month,
  weekendMode,
  onDayClick,
  onEventClick,
}: {
  events: CalendarDayEvent[];
  year: number;
  month: number;
  weekendMode: "sat_sun" | "fri_sat" | "sun_only";
  onDayClick: (date: string, dayEvents: CalendarDayEvent[]) => void;
  onEventClick: (event: CalendarDayEvent) => void;
}) {
  const { weeks } = useMemo(() => calendarMonthBounds(year, month), [year, month]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarDayEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    return map;
  }, [events]);

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div className="px-2 py-2" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="divide-y divide-border">
        {weeks.map((week) => (
          <div className="grid grid-cols-7 divide-x divide-border" key={week[0]}>
            {week.map((date) => {
              const dayEvents = eventsByDate.get(date) ?? [];
              const inMonth = date.startsWith(monthPrefix);
              const isToday = date === today;
              return (
                <button
                  className={cn(
                    "min-h-24 space-y-1 p-1.5 text-left align-top transition-colors hover:bg-muted/30",
                    !inMonth && "bg-muted/20 text-muted-foreground",
                    isWeekendDate(date, weekendMode) && inMonth && "bg-muted/10",
                    isToday && "ring-1 ring-inset ring-primary",
                  )}
                  key={date}
                  onClick={() => onDayClick(date, dayEvents)}
                  type="button"
                >
                  <span className="text-xs font-medium">{Number(date.slice(8, 10))}</span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <CalendarEventChip
                        compact
                        event={event}
                        key={event.id}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                    {dayEvents.length > 3 ? (
                      <span className="block px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarMonthNavLink({
  basePath,
  year,
  month,
  children,
}: {
  basePath: string;
  year: number;
  month: number;
  children: React.ReactNode;
}) {
  return (
    <Link href={`${basePath}?year=${year}&month=${month}`}>
      {children}
    </Link>
  );
}
