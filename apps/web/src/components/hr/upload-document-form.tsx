"use client";

import { useActionState } from "react";

import { uploadEmployeeDocumentAction, type HrActionState } from "@/app/(hr)/hr/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

export function UploadDocumentForm({
  employees,
}: {
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  const [state, action, pending] = useActionState(uploadEmployeeDocumentAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <HrField id="employeeId" label="Employee">
        <HrSelect defaultValue="" id="employeeId" name="employeeId" required>
          <option disabled value="">
            Select employee
          </option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employee_number} · {employee.full_name}
            </option>
          ))}
        </HrSelect>
      </HrField>
      <HrField id="documentType" label="Document type">
        <HrTextInput id="documentType" name="documentType" placeholder="e.g. Offer letter" required />
      </HrField>
      <HrField id="expiresAt" label="Expires (optional)">
        <HrTextInput id="expiresAt" name="expiresAt" type="date" />
      </HrField>
      <HrField id="file" label="File">
        <input
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="block w-full text-sm text-[var(--foreground-secondary)]"
          id="file"
          name="file"
          required
          type="file"
        />
      </HrField>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Uploading…" : "Upload"}
      </HrPrimaryButton>
    </form>
  );
}
