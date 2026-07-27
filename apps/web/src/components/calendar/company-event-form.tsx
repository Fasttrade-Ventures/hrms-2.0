"use client";

import { useActionState, useTransition } from "react";

import {
  createCompanyEventAction,
  deleteCompanyEventAction,
  updateCompanyEventAction,
  type CalendarActionState,
} from "@/app/(hr)/hr/calendar/actions";
import { AnnouncementFormField } from "@/components/hr/announcements/announcement-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyEventRow } from "@/lib/calendar/types";

type Option = { id: string; name: string };

const initialState: CalendarActionState = {};

export function CompanyEventFormDialog({
  open,
  onOpenChange,
  branches,
  departments,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Option[];
  departments: Option[];
  event?: CompanyEventRow | null;
}) {
  const action = event ? updateCompanyEventAction : createCompanyEventAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [deletePending, startDelete] = useTransition();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit company event" : "Add company event"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {event ? <input name="eventId" type="hidden" value={event.id} /> : null}

          <AnnouncementFormField id="title" label="Title">
            <Input defaultValue={event?.title} id="title" name="title" required />
          </AnnouncementFormField>

          <AnnouncementFormField id="kind" label="Type">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={event?.kind ?? "other"}
              id="kind"
              name="kind"
            >
              <option value="training">Training</option>
              <option value="office_closure">Office closure</option>
              <option value="town_hall">Town hall</option>
              <option value="other">Other</option>
            </select>
          </AnnouncementFormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <AnnouncementFormField label="Start date">
              <Input defaultValue={event?.startDate} name="startDate" required type="date" />
            </AnnouncementFormField>
            <AnnouncementFormField label="End date">
              <Input defaultValue={event?.endDate} name="endDate" required type="date" />
            </AnnouncementFormField>
          </div>

          <AnnouncementFormField label="Branch">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={event?.branchId ?? ""}
              name="branchId"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </AnnouncementFormField>

          <div className="space-y-2">
            <Label>Departments (optional)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {departments.map((department) => (
                <label className="flex items-center gap-2 text-sm" key={department.id}>
                  <input
                    defaultChecked={event?.targetDepartmentIds.includes(department.id)}
                    name="targetDepartmentIds"
                    type="checkbox"
                    value={department.id}
                  />
                  {department.name}
                </label>
              ))}
            </div>
          </div>

          <AnnouncementFormField label="Description">
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={event?.description ?? ""}
              name="description"
            />
          </AnnouncementFormField>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

          <div className="flex justify-between gap-2">
            {event ? (
              <Button
                disabled={deletePending || pending}
                onClick={() =>
                  startDelete(async () => {
                    await deleteCompanyEventAction(event.id);
                    onOpenChange(false);
                  })
                }
                type="button"
                variant="destructive"
              >
                {deletePending ? "Deleting…" : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={pending || deletePending} type="submit">
              {pending ? "Saving…" : event ? "Update event" : "Create event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
