"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { createEmployee, type EmployeeActionState } from "@/app/(hr)/hr/employees/actions";

const initialState: EmployeeActionState = {};

type Option = { id: string; name: string; branch_id?: string | null };

export function CreateEmployeeForm({
  suggestedEmployeeNumber,
  joinDate,
  branches,
  departments,
  managers,
}: {
  suggestedEmployeeNumber: string;
  joinDate: string;
  branches: Option[];
  departments: Option[];
  managers: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  const [state, formAction, pending] = useActionState(createEmployee, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-5 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Basic information</h2>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            HR creates the employee record. Login access is optional via activation email.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="fullName" label="Full name">
            <HrTextInput id="fullName" name="fullName" required />
          </HrField>

          <HrField id="email" label="Work email">
            <HrTextInput autoComplete="email" id="email" name="email" required type="email" />
          </HrField>

          <HrField hint="Leave blank to auto-generate" id="employeeNumber" label="Employee number">
            <HrTextInput
              defaultValue={suggestedEmployeeNumber}
              id="employeeNumber"
              name="employeeNumber"
              placeholder={suggestedEmployeeNumber}
            />
          </HrField>

          <HrField id="joinDate" label="Join date">
            <HrTextInput defaultValue={joinDate} id="joinDate" name="joinDate" required type="date" />
          </HrField>
        </div>
      </section>

      <section className="space-y-5 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Assignment</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="branchId" label="Branch">
            <HrSelect defaultValue="" id="branchId" name="branchId">
              <option value="">No branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </HrSelect>
          </HrField>

          <HrField id="departmentId" label="Department">
            <HrSelect defaultValue="" id="departmentId" name="departmentId">
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </HrSelect>
          </HrField>

          <HrField id="managerEmployeeId" label="Manager">
            <HrSelect defaultValue="" id="managerEmployeeId" name="managerEmployeeId">
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name} ({manager.employee_number})
                </option>
              ))}
            </HrSelect>
          </HrField>
        </div>
      </section>

      <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <HrCheckbox
          defaultChecked
          id="sendActivationEmail"
          label="Send activation email so the employee can set a password and sign in"
          name="sendActivationEmail"
        />
      </section>

      <HrFormMessage error={state.error} success={state.success} />

      <div className="flex flex-wrap gap-3">
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Creating…" : "Create employee"}
        </HrPrimaryButton>
        <Link href="/hr/employees">
          <HrGhostButton type="button">Cancel</HrGhostButton>
        </Link>
      </div>
    </form>
  );
}
