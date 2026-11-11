"use client";

import { useActionState } from "react";

import {
  importEmployeesCsv,
  type EmployeeImportActionState,
} from "@/app/(hr)/hr/employees/import/actions";
import {
  EmployeeFormBanner,
} from "@/components/hr/employees/employee-form-shell";
import { HrCheckbox, HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { OrgFormCard } from "@/components/hr/organization/org-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { EMPLOYEE_IMPORT_TEMPLATE } from "@/lib/employees/import-csv";

const initialState: EmployeeImportActionState = {};

export function EmployeeImportForm() {
  const [state, action, pending] = useActionState(importEmployeesCsv, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/employees" variant="outline">
            Back to directory
          </HrLinkButton>
        }
        description="Upload a CSV to create multiple employees. Requires the Professional import module."
        title="Bulk import employees"
      />

      {state.success ? <EmployeeFormBanner>{state.success}</EmployeeFormBanner> : null}
      {state.error ? <HrFormMessage error={state.error} /> : null}

      <OrgFormCard
        description="Required columns: full_name, email, join_date (YYYY-MM-DD)."
        showClose={false}
        title="CSV template"
      >
        <p className="text-sm text-[var(--foreground-secondary)]">
          Required columns: <code>full_name</code>, <code>email</code>, <code>join_date</code> (YYYY-MM-DD).
          Optional: <code>job_title</code>, <code>branch</code>, <code>department</code>,{" "}
          <code>employee_number</code>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs">
          {EMPLOYEE_IMPORT_TEMPLATE}
        </pre>
      </OrgFormCard>

      <form action={action} className="space-y-4">
        <OrgFormCard description="Choose a CSV file to import." showClose={false} title="Upload file">
          <div className="grid items-center gap-x-4 gap-y-4 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <label className="contents">
              <span className="text-[13px] font-medium leading-none text-[var(--foreground-primary)]">CSV file</span>
              <input
                accept=".csv,text/csv"
                className="block w-full min-w-0 cursor-pointer rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm leading-none text-[var(--foreground-primary)] file:mr-3 file:inline-flex file:cursor-pointer file:items-center file:rounded-md file:border-0 file:bg-[var(--accent-primary)] file:px-3.5 file:py-2 file:align-middle file:text-sm file:font-medium file:leading-none file:text-white"
                name="file"
                required
                type="file"
              />
            </label>
            <div className="sm:col-start-2">
              <HrCheckbox
                defaultChecked
                id="sendActivationEmail"
                label="Send activation emails for new employees"
                name="sendActivationEmail"
              />
            </div>
          </div>
        </OrgFormCard>

        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Importing…" : "Import employees"}
        </HrPrimaryButton>
      </form>

      {state.results?.length ? (
        <OrgFormCard description="Per-row outcomes from the last import." showClose={false} title="Import results">
          <div className="divide-y divide-[var(--border-primary)] text-sm">
            {state.results.map((row) => (
              <div className="flex flex-wrap items-start justify-between gap-2 py-2" key={`${row.row}-${row.email}`}>
                <div>
                  <p className="font-medium">
                    Row {row.row}: {row.email}
                  </p>
                  <p className="text-[var(--foreground-muted)]">{row.message}</p>
                </div>
                <span
                  className={
                    row.status === "success"
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]"
                  }
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </OrgFormCard>
      ) : null}
    </div>
  );
}
