"use client";

import { useMemo, useState } from "react";

import type { CalendarDayEvent } from "@hrms/domain";

import { exportHrCalendarCsvAction } from "@/app/(hr)/hr/calendar/actions";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import { CalendarShell } from "@/components/calendar/calendar-shell";
import { CompanyEventFormDialog } from "@/components/calendar/company-event-form";
import { Button } from "@/components/ui/button";
import { buildHrCalendarHref } from "@/lib/calendar/parse-filters";
import type { CompanyEventRow, HrCalendarFilters } from "@/lib/calendar/types";

export function HrCalendarView({
  events,
  year,
  month,
  weekendMode,
  filters,
  branches,
  departments,
  companyEvents,
}: {
  events: CalendarDayEvent[];
  year: number;
  month: number;
  weekendMode: "sat_sun" | "fri_sat" | "sun_only";
  filters: HrCalendarFilters;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  companyEvents: CompanyEventRow[];
}) {
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CompanyEventRow | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<CalendarDayEvent | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const buildMonthHref = useMemo(
    () => (y: number, m: number) => buildHrCalendarHref(y, m, filters),
    [filters],
  );

  async function handleExportCsv() {
    const result = await exportHrCalendarCsvAction({ year, month, filters });
    if ("error" in result) {
      window.alert(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleEventClick(event: CalendarDayEvent) {
    if (event.kind === "company_event") {
      const match = companyEvents.find((row) => row.id === event.sourceId) ?? null;
      setEditingEvent(match);
      setCompanyDialogOpen(true);
      return;
    }
    if (event.kind === "leave") {
      setSelectedLeave(event);
      setLeaveDialogOpen(true);
      return;
    }
    if (event.href) window.location.href = event.href;
  }

  function openCreateDialog() {
    setEditingEvent(null);
    setCompanyDialogOpen(true);
  }

  return (
    <>
      <CalendarShell
        basePath="/hr/calendar"
        buildMonthHref={buildMonthHref}
        events={events}
        mode="hr"
        month={month}
        onEventClick={handleEventClick}
        onExportCsv={handleExportCsv}
        printTitle="HR Calendar"
        showCompanyLegend
        showExport
        toolbarExtra={
          <Button onClick={openCreateDialog} size="sm" type="button">
            Add event
          </Button>
        }
        weekendMode={weekendMode}
        year={year}
      />

      <CompanyEventFormDialog
        branches={branches}
        departments={departments}
        event={editingEvent}
        onOpenChange={setCompanyDialogOpen}
        open={companyDialogOpen}
      />

      <CalendarEventDetailDialog
        event={selectedLeave}
        mode="hr"
        onOpenChange={setLeaveDialogOpen}
        open={leaveDialogOpen}
      />
    </>
  );
}
