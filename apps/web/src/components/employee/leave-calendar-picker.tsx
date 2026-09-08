"use client";

import { useMemo, useState } from "react";
import type { LeaveDateSpan } from "@/lib/leave/overlap-utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function LeaveCalendarPicker({
  startDate,
  endDate,
  onRangeChange,
  existingRequests,
}: {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  existingRequests: LeaveDateSpan[];
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Initialize view month to startDate's month or current month
  const initialDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1); // 1-12

  // Map each booked date (YYYY-MM-DD) to its active leave request
  const bookedDatesMap = useMemo(() => {
    const map = new Map<string, LeaveDateSpan>();
    for (const req of existingRequests) {
      // Only pending or approved requests block dates
      if (req.status !== "pending" && req.status !== "approved") continue;

      const cur = new Date(`${req.startDate}T00:00:00`);
      const end = new Date(`${req.endDate}T00:00:00`);

      while (cur <= end) {
        const dateStr = cur.toISOString().slice(0, 10);
        map.set(dateStr, req);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [existingRequests]);

  // Compute month grid (weeks)
  const calendarDays = useMemo(() => {
    // First day of view month
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    // 0 = Sun, 1 = Mon ... 6 = Sat. We want Monday as 0
    const dayOfWeek = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isWeekend: boolean;
      bookedBy: LeaveDateSpan | undefined;
    }> = [];

    // Days from previous month
    const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(viewYear, viewMonth - 2, d);
      const dateStr = prevDate.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isPast: dateStr < today,
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
        bookedBy: bookedDatesMap.get(dateStr),
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(viewYear, viewMonth - 1, d);
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isPast: dateStr < today,
        isWeekend: curDate.getDay() === 0 || curDate.getDay() === 6,
        bookedBy: bookedDatesMap.get(dateStr),
      });
    }

    // Days from next month to complete 6 weeks (42 cells) or 5 weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth, d);
      const dateStr = nextDate.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isPast: dateStr < today,
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
        bookedBy: bookedDatesMap.get(dateStr),
      });
    }

    return days;
  }, [viewYear, viewMonth, today, bookedDatesMap]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDateClick = (dateStr: string, isBooked: boolean, isPast: boolean) => {
    if (isBooked || isPast) return;

    // Range selection logic
    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      // Start fresh selection
      onRangeChange(dateStr, dateStr);
    } else if (startDate && (!endDate || startDate === endDate)) {
      if (dateStr < startDate) {
        // If clicked earlier, make it new start date
        onRangeChange(dateStr, dateStr);
      } else {
        // Check if any booked dates are in between
        let hasBookedInRange = false;
        const cur = new Date(`${startDate}T00:00:00`);
        const target = new Date(`${dateStr}T00:00:00`);
        while (cur <= target) {
          if (bookedDatesMap.has(cur.toISOString().slice(0, 10))) {
            hasBookedInRange = true;
            break;
          }
          cur.setDate(cur.getDate() + 1);
        }

        if (hasBookedInRange) {
          // Cannot span over booked dates; set clicked date as new single date
          onRangeChange(dateStr, dateStr);
        } else {
          onRangeChange(startDate, dateStr);
        }
      }
    }
  };

  const monthName = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--surface-muted)]/40 p-4 space-y-3">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--foreground-primary)]">{monthName}</h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] text-xs font-bold text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] transition"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] text-xs font-bold text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] transition"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--foreground-muted)] uppercase">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const isSelected =
            startDate &&
            endDate &&
            day.dateStr >= startDate &&
            day.dateStr <= endDate &&
            !day.bookedBy &&
            !day.isPast;

          const isStartOrEnd = day.dateStr === startDate || day.dateStr === endDate;
          const isBooked = Boolean(day.bookedBy);
          const isDisabled = day.isPast || isBooked || !day.isCurrentMonth;

          let tooltip = "";
          if (day.bookedBy) {
            tooltip = `${day.bookedBy.leaveTypeName ?? "Leave"} (${day.bookedBy.status}) · Cancel request to reapply`;
          } else if (day.isPast) {
            tooltip = "Past date";
          } else if (day.isWeekend) {
            tooltip = "Weekend (Non-working day)";
          }

          return (
            <button
              key={day.dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDateClick(day.dateStr, isBooked, day.isPast)}
              title={tooltip}
              className={`relative flex h-8 w-full flex-col items-center justify-center rounded-[var(--radius-md)] text-xs font-medium transition-all ${
                isSelected
                  ? "bg-[var(--accent-primary)] text-white shadow-xs"
                  : isBooked
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 line-through opacity-70 cursor-not-allowed"
                    : day.isPast
                      ? "opacity-30 text-[var(--foreground-muted)] cursor-not-allowed"
                      : !day.isCurrentMonth
                        ? "opacity-20 text-[var(--foreground-muted)] cursor-not-allowed"
                        : day.isWeekend
                          ? "bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:bg-[var(--accent-primary)]/15"
                          : "bg-[var(--surface-card)] text-[var(--foreground-primary)] hover:bg-[var(--accent-primary)]/15 border border-transparent"
              } ${isStartOrEnd && isSelected ? "font-bold ring-2 ring-[var(--accent-primary)]/50" : ""}`}
            >
              <span>{day.dayNumber}</span>
              {isBooked && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[var(--border-primary)]/50 text-[10px] text-[var(--foreground-muted)]">
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]"></span>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/30 border border-amber-500/50"></span>
          <span>Booked (Disabled)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--surface-card)] border border-[var(--border-primary)]"></span>
          <span>Available</span>
        </div>
      </div>
    </div>
  );
}
