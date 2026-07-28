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
import { EMPLOYEE_IMPORT_TEMPLATE } from "@/lib/employees/import";

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
        backHref="/hr/employees"
        description="Required columns: full_name, email, join_date (YYYY-MM-DD)."
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
        <OrgFormCard backHref="/hr/employees" description="Choose a CSV file to import." title="Upload file">
          <label className="block space-y-2">
            <span className="text-[13px] font-medium text-[var(--foreground-primary)]">CSV file</span>
            <input
              accept=".csv,text/csv"
              className="block w-full text-sm"
              name="file"
              required
              type="file"
            />
          </label>
          <HrCheckbox
            defaultChecked
            id="sendActivationEmail"
            label="Send activation emails for new employees"
            name="sendActivationEmail"
          />
        </OrgFormCard>

        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Importing…" : "Import employees"}
        </HrPrimaryButton>
      </form>

      {state.results?.length ? (
        <OrgFormCard backHref="/hr/employees" description="Per-row outcomes from the last import." title="Import results">
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
