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
  const existingLeaveEvent =
    mode === "employee"
      ? events.find((e) => e.kind === "leave" && (e.status === "pending" || e.status === "approved"))
      : null;

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
          <div className="space-y-3">
            <div className="space-y-2">
              {events.map((event) => (
                <CalendarEventChip event={event} key={event.id} onClick={() => onEventClick(event)} />
              ))}
            </div>

            {existingLeaveEvent ? (
              <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold">Date already requested</p>
                <p className="mt-1">
                  You already have an active {existingLeaveEvent.status} leave request on this date.
                  You must cancel your leave request first before you are able to apply for this date again.
                </p>
                {existingLeaveEvent.sourceId && (
                  <div className="mt-2">
                    <Link
                      href={`/employee/leave/${existingLeaveEvent.sourceId}`}
                      className="font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      View or cancel request →
                    </Link>
                  </div>
                )}
              </div>
            ) : mode === "employee" && date ? (
              <div className="pt-1">
                <Button render={<Link href={`/employee/leave?startDate=${date}&endDate=${date}`} />}>
                  Apply leave
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
