"use client";

import { useActionState } from "react";

import { upsertRosterEntryAction, type OrgActionState } from "@/app/(hr)/hr/organization/actions";
import {
  HrField,
  HrSelect,
  HrTextInput,
  OrgFormActions,
  OrgFormCard,
  OrgTableCell,
  OrgTableRow,
  OrgTableShell,
} from "@/components/hr/organization/org-ui";
import { Button } from "@/components/ui/button";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { BranchRow, ShiftRow } from "@/lib/hr/organization";
import type { RosterEntryRow } from "@/lib/hr/rosters";

const initialState: OrgActionState = {};

export function RostersPlanner({
  weekStart,
  weekDates,
  entries,
  employees,
  shifts,
  branches,
  branchId,
}: {
  weekStart: string;
  weekDates: string[];
  entries: RosterEntryRow[];
  employees: Array<{ id: string; name: string; employeeNumber: string }>;
  shifts: ShiftRow[];
  branches: BranchRow[];
  branchId?: string;
}) {
  const [state, formAction, pending] = useActionState(upsertRosterEntryAction, initialState);
  const entryKey = (employeeId: string, workDate: string) =>
    entries.find((entry) => entry.employeeId === employeeId && entry.workDate === workDate);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href={`/hr/organization/rosters?weekStart=${weekStart}`} variant="outline">
              This week
            </HrLinkButton>
          </div>
        }
        description="Assign shift patterns to employees by day."
        title="Work rosters"
      />

      <OrgFormCard backHref="/hr/organization/rosters" description="Quick assign a single day." title="Assign shift">
        <form action={formAction} className="grid gap-4 md:grid-cols-4">
          <input name="weekStart" type="hidden" value={weekStart} />
          <input name="branchId" type="hidden" value={branchId ?? ""} />
          <HrField id="employeeId" label="Employee">
            <HrSelect defaultValue="" id="employeeId" name="employeeId" required>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employeeNumber})
                </option>
              ))}
            </HrSelect>
          </HrField>
          <HrField id="workDate" label="Work date">
            <HrSelect defaultValue={weekDates[0]} id="workDate" name="workDate" required>
              {weekDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </HrSelect>
          </HrField>
          <HrField id="shiftId" label="Shift">
            <HrSelect defaultValue="" id="shiftId" name="shiftId" required>
              <option value="">Select shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)})
                </option>
              ))}
            </HrSelect>
          </HrField>
          <HrField id="notes" label="Notes">
            <HrTextInput id="notes" name="notes" placeholder="Optional" />
          </HrField>
          <OrgFormActions cancelHref="/hr/organization/rosters" pending={pending} submitLabel="Save assignment" />
        </form>
        {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="mt-3 text-sm text-emerald-600">{state.success}</p> : null}
      </OrgFormCard>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <HrField id="branchFilter" label="Branch filter">
          <HrSelect defaultValue={branchId ?? ""} id="branchFilter" name="branchId">
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <HrField id="weekStart" label="Week starting">
          <HrTextInput defaultValue={weekStart} id="weekStart" name="weekStart" type="date" />
        </HrField>
        <Button size="sm" type="submit">
          Apply
        </Button>
      </form>

      <OrgTableShell
        emptyDescription="Assign shifts using the form above."
        emptyTitle="No roster assignments this week"
        headers={["Employee", ...weekDates.map((date) => date.slice(5)), "Notes"]}
        isEmpty={employees.length === 0}
      >
        {employees.map((employee) => (
          <OrgTableRow key={employee.id}>
            <OrgTableCell variant="name">
              <span>{employee.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-[var(--foreground-muted)]">
                {employee.employeeNumber}
              </span>
            </OrgTableCell>
            {weekDates.map((date) => {
              const entry = entryKey(employee.id, date);
              return (
                <OrgTableCell key={`${employee.id}-${date}`}>
                  {entry ? (
                    <span className="text-xs">
                      {entry.shiftName}
                      <span className="block text-[var(--foreground-muted)]">
                        {entry.shiftStart.slice(0, 5)}–{entry.shiftEnd.slice(0, 5)}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </OrgTableCell>
              );
            })}
            <OrgTableCell variant="muted">
              {entries.find((entry) => entry.employeeId === employee.id)?.notes ?? "—"}
            </OrgTableCell>
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}
