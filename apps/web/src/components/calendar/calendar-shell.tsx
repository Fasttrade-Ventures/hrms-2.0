"use client";

import { useEffect, useMemo, useState } from "react";

import type { CalendarDayEvent } from "@hrms/domain";

import { CalendarAgenda } from "@/components/calendar/calendar-agenda";
import { CalendarDayDialog } from "@/components/calendar/calendar-day-dialog";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { CalendarMonth } from "@/components/calendar/calendar-month";
import { CalendarPrintLayout } from "@/components/calendar/calendar-print-layout";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import type { CalendarPortalMode } from "@/lib/calendar/types";

export function CalendarShell({
  events,
  year,
  month,
  mode,
  weekendMode,
  basePath,
  showCompanyLegend = false,
  showExport = false,
  onExportCsv,
  toolbarExtra,
  printTitle,
  onEventClick,
  buildMonthHref,
}: {
  events: CalendarDayEvent[];
  year: number;
  month: number;
  mode: CalendarPortalMode;
  weekendMode: "sat_sun" | "fri_sat" | "sun_only";
  basePath: string;
  showCompanyLegend?: boolean;
  showExport?: boolean;
  onExportCsv?: () => void;
  toolbarExtra?: React.ReactNode;
  printTitle: string;
  onEventClick?: (event: CalendarDayEvent) => void;
  buildMonthHref?: (year: number, month: number) => string;
}) {
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarDayEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarDayEvent | null>(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setView(mq.matches ? "agenda" : "month");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const monthEvents = useMemo(() => events, [events]);

  function openDay(date: string, dayEvents: CalendarDayEvent[]) {
    setSelectedDay(date);
    setSelectedDayEvents(dayEvents);
    setDayOpen(true);
  }

  function openEvent(event: CalendarDayEvent) {
    if (onEventClick) {
      onEventClick(event);
      return;
    }
    setSelectedEvent(event);
    setEventOpen(true);
    setDayOpen(false);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <CalendarToolbar
        basePath={basePath}
        buildMonthHref={buildMonthHref}
        extraActions={toolbarExtra}
        month={month}
        onExportCsv={onExportCsv}
        onPrint={handlePrint}
        onViewChange={setView}
        showExport={showExport}
        view={view}
        year={year}
      />

      <CalendarLegend showCompanyEvents={showCompanyLegend} />

      <div className="print:hidden">
        {view === "month" ? (
          <CalendarMonth
            events={monthEvents}
            month={month}
            onDayClick={openDay}
            onEventClick={openEvent}
            weekendMode={weekendMode}
            year={year}
          />
        ) : (
          <CalendarAgenda events={monthEvents} month={month} onEventClick={openEvent} year={year} />
        )}
      </div>

      <CalendarPrintLayout events={monthEvents} month={month} title={printTitle} year={year} />

      <CalendarDayDialog
        date={selectedDay}
        events={selectedDayEvents}
        mode={mode}
        onEventClick={openEvent}
        onOpenChange={setDayOpen}
        open={dayOpen}
      />

      <CalendarEventDetailDialog
        event={selectedEvent}
        mode={mode}
        onOpenChange={setEventOpen}
        open={eventOpen}
      />
    </div>
  );
}
