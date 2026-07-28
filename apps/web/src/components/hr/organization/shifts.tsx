"use client";

import { useActionState, useMemo } from "react";

import {
  createShift,
  deleteShift,
  updateShift,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrField,
  HrTextInput,
  OrgDeleteButton,
  OrgFormActions,
  OrgFormCard,
  OrgStatCards,
  OrgTableCell,
  OrgTableEditLink,
  OrgTableRow,
  OrgTableShell,
  OrgTableStatus,
} from "@/components/hr/organization/org-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { ShiftRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function ShiftsList({ shifts }: { shifts: ShiftRow[] }) {
  const totalEmployees = shifts.reduce((sum, row) => sum + row.employeeCount, 0);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/shifts/create">Add shift</HrLinkButton>
          </div>
        }
        description="Attendance patterns assigned on employee profiles."
        title="Shifts"
      />

      <OrgStatCards
        items={[
          { label: "Shifts", value: shifts.length, hint: "patterns" },
          { label: "Assigned staff", value: totalEmployees, hint: "with shift set" },
          {
            label: "With grace",
            value: shifts.filter((row) => row.graceMinutes > 0).length,
            hint: "late buffer",
          },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create a shift so employees can be assigned for attendance."
        emptyTitle="No shifts yet"
        headers={["Name", "Hours", "Grace", "Staff", "Status", "Action"]}
        isEmpty={shifts.length === 0}
      >
        {shifts.map((shift) => (
          <OrgTableRow key={shift.id}>
            <OrgTableCell variant="name">{shift.name}</OrgTableCell>
            <OrgTableCell>
              {shift.startTime} – {shift.endTime}
            </OrgTableCell>
            <OrgTableCell variant="muted">{shift.graceMinutes} min</OrgTableCell>
            <OrgTableCell variant="muted">{shift.employeeCount}</OrgTableCell>
            <OrgTableStatus />
            <OrgTableEditLink href={`/hr/organization/shifts/${shift.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function ShiftForm({ shift }: { shift?: ShiftRow }) {
  const boundUpdate = useMemo(
    () => (shift ? updateShift.bind(null, shift.id) : createShift),
    [shift],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/shifts" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Start and end times use 24-hour clock."
        title={shift ? "Edit shift" : "Create shift"}
      />

      <OrgFormCard
        backHref="/hr/organization/shifts"
        description="Shifts appear in employee create and edit forms."
        title={shift ? "Edit shift" : "Create shift"}
      >
        <form action={formAction} className="space-y-5">
          <HrField id="name" label="Shift name">
            <HrTextInput defaultValue={shift?.name ?? ""} id="name" name="name" required />
          </HrField>
          <div className="grid gap-4 md:grid-cols-3">
            <HrField id="startTime" label="Start time">
              <HrTextInput
                defaultValue={shift?.startTime ?? "09:00"}
                id="startTime"
                name="startTime"
                required
                type="time"
              />
            </HrField>
            <HrField id="endTime" label="End time">
              <HrTextInput
                defaultValue={shift?.endTime ?? "18:00"}
                id="endTime"
                name="endTime"
                required
                type="time"
              />
            </HrField>
            <HrField id="graceMinutes" label="Grace minutes">
              <HrTextInput
                defaultValue={String(shift?.graceMinutes ?? 0)}
                id="graceMinutes"
                min={0}
                name="graceMinutes"
                type="number"
              />
            </HrField>
          </div>
          <OrgFormActions
            cancelHref="/hr/organization/shifts"
            error={state.error}
            extra={
              shift ? (
                <OrgDeleteButton
                  confirmDescription="This permanently removes the shift. Employees must be unassigned first."
                  confirmTitle={`Delete ${shift.name}?`}
                  label="Delete shift"
                  onDelete={() => deleteShift(shift.id)}
                  redirectHref="/hr/organization/shifts"
                />
              ) : null
            }
            pending={pending}
            submitLabel={shift ? "Save shift" : "Create shift"}
            success={state.success}
          />
        </form>
      </OrgFormCard>
    </div>
  );
}
