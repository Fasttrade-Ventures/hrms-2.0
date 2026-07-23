"use client";

import { useActionState } from "react";

import { applyLeave, type EmployeeActionState } from "@/app/(employee)/employee/actions";
import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import type { LeaveTypeOption } from "@/lib/employee/leave";

const initialState: EmployeeActionState = {};

export function LeaveApplyForm({
  leaveTypes,
  defaultStartDate,
}: {
  leaveTypes: LeaveTypeOption[];
  defaultStartDate: string;
}) {
  const [state, formAction, pending] = useActionState(applyLeave, initialState);

  return (
    <form action={formAction} className="space-y-5 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Apply leave</h2>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Submit a request for manager approval.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="leaveTypeId" label="Leave type">
          <HrSelect defaultValue="" id="leaveTypeId" name="leaveTypeId" required>
            <option disabled value="">
              Select leave type
            </option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.isUnpaid ? " (unpaid)" : ""}
              </option>
            ))}
          </HrSelect>
        </HrField>

        <div />

        <HrField id="startDate" label="Start date">
          <HrTextInput defaultValue={defaultStartDate} id="startDate" name="startDate" required type="date" />
        </HrField>

        <HrField id="endDate" label="End date">
          <HrTextInput defaultValue={defaultStartDate} id="endDate" name="endDate" required type="date" />
        </HrField>
      </div>

      <HrCheckbox id="halfDay" label="Half day (last day only)" name="halfDay" />

      <HrField id="reason" label="Reason">
        <HrTextInput id="reason" name="reason" placeholder="Optional" />
      </HrField>

      <HrFormMessage error={state.error} success={state.success} />

      <div className="flex gap-3">
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Submitting…" : "Submit leave request"}
        </HrPrimaryButton>
        <HrGhostButton disabled={pending} type="reset">
          Clear
        </HrGhostButton>
      </div>
    </form>
  );
}
