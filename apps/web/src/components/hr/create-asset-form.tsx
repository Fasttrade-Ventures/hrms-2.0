"use client";

import { useActionState } from "react";

import { createAssetAction, type HrActionState } from "@/app/(hr)/hr/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

export function CreateAssetForm({
  employees,
}: {
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  const [state, action, pending] = useActionState(createAssetAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <HrField id="name" label="Asset name">
        <HrTextInput id="name" name="name" required />
      </HrField>
      <HrField id="category" label="Category">
        <HrTextInput id="category" name="category" placeholder="e.g. Laptop" />
      </HrField>
      <HrField id="serialNumber" label="Serial number">
        <HrTextInput id="serialNumber" name="serialNumber" />
      </HrField>
      <HrField id="assignedEmployeeId" label="Assigned to">
        <HrSelect defaultValue="" id="assignedEmployeeId" name="assignedEmployeeId">
          <option value="">Unassigned</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employee_number} · {employee.full_name}
            </option>
          ))}
        </HrSelect>
      </HrField>
      <HrField id="issuedAt" label="Issued date">
        <HrTextInput id="issuedAt" name="issuedAt" type="date" />
      </HrField>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Saving…" : "Create asset"}
      </HrPrimaryButton>
    </form>
  );
}
