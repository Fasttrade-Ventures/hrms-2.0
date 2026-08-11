"use client";

import { useActionState, useState } from "react";

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
  defaultEndDate,
}: {
  leaveTypes: LeaveTypeOption[];
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [state, formAction, pending] = useActionState(applyLeave, initialState);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");

  const selectedType = leaveTypes.find((t) => t.id === selectedLeaveTypeId);
  const requiresAttachment = selectedType?.requiresAttachment ?? false;

  return (
    <form
      action={formAction}
      className="space-y-5 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6"
    >
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Apply leave</h2>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Submit a request for manager approval.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="leaveTypeId" label="Leave type">
          <HrSelect
            value={selectedLeaveTypeId}
            onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
            id="leaveTypeId"
            name="leaveTypeId"
            required
          >
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
          <HrTextInput defaultValue={defaultEndDate} id="endDate" name="endDate" required type="date" />
        </HrField>
      </div>

      <HrCheckbox id="halfDay" label="Half day (last day only)" name="halfDay" />

      {requiresAttachment && (
        <HrField id="file" label="Supporting document (Medical Certificate, etc.)">
          <input
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            id="file"
            name="file"
            required
            type="file"
          />
        </HrField>
      )}

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
