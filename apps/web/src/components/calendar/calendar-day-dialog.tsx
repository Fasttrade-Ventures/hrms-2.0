"use client";

import Link from "next/link";

import type { CalendarDayEvent } from "@hrms/domain";

import { formatDateTime } from "@/components/employee/employee-shared";
import { CalendarEventChip } from "@/components/calendar/calendar-event-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CalendarDayDialog({
  date,
  events,
  mode,
  open,
  onOpenChange,
  onEventClick,
}: {
  date: string | null;
  events: CalendarDayEvent[];
  mode: "employee" | "manager" | "hr";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (event: CalendarDayEvent) => void;
}) {
  const isEmpty = events.length === 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{date ? formatDateTime(`${date}T00:00:00`) : "Day"}</DialogTitle>
        </DialogHeader>

        {isEmpty ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No events on this day.</p>
            {mode === "employee" && date ? (
              <Button render={<Link href={`/employee/leave?startDate=${date}&endDate=${date}`} />}>
                Apply leave
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <CalendarEventChip event={event} key={event.id} onClick={() => onEventClick(event)} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
