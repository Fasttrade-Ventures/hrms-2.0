"use client";

import Link from "next/link";

import type { CalendarDayEvent } from "@hrms/domain";

import { ApprovalActions } from "@/components/manager/approval-actions";
import { HrCalendarApprovalActions } from "@/components/calendar/hr-calendar-approval-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CalendarEventDetailDialog({
  event,
  mode,
  open,
  onOpenChange,
}: {
  event: CalendarDayEvent | null;
  mode: "employee" | "manager" | "hr";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!event) return null;

  const canApprove =
    (mode === "manager" || mode === "hr") &&
    event.kind === "leave" &&
    event.status === "pending" &&
    Boolean(event.approvalStepId);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{event.kind.replace("_", " ")}</Badge>
            {event.status ? <Badge variant="secondary">{event.status}</Badge> : null}
            {event.leaveTypeName ? <Badge variant="outline">{event.leaveTypeName}</Badge> : null}
          </div>

          <p className="text-muted-foreground">{event.date}</p>
          {event.employeeName ? <p>Employee: {event.employeeName}</p> : null}
          {event.branchName ? <p>Branch: {event.branchName}</p> : null}

          {canApprove && event.approvalStepId ? (
            mode === "hr" ? (
              <HrCalendarApprovalActions stepId={event.approvalStepId} />
            ) : (
              <ApprovalActions stepId={event.approvalStepId} />
            )
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            {event.href ? (
              <Button render={<Link href={event.href} />} size="sm" variant="outline">
                View details
              </Button>
            ) : null}
            {mode === "employee" && event.kind === "leave" && event.sourceId ? (
              <Button render={<Link href={`/employee/leave/${event.sourceId}`} />} size="sm">
                Open leave
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
