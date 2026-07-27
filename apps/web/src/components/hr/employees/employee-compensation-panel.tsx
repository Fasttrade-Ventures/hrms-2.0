"use client";

import { useActionState } from "react";

import {
  deleteRecurringAllowanceAction,
  updateEmployeeCompensationAction,
  upsertRecurringAllowanceAction,
  type HrActionState,
} from "@/app/(hr)/hr/payroll/actions";
import { HrFormMessage, HrGhostButton, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type {
  AllowanceComponentOption,
  EmployeeCompensation,
  RecurringAllowance,
} from "@/lib/payroll/compensation";

const initialState: HrActionState = {};

export function EmployeeCompensationPanel({
  employeeId,
  compensation,
  allowances,
  allowanceComponents,
}: {
  employeeId: string;
  compensation: EmployeeCompensation;
  allowances: RecurringAllowance[];
  allowanceComponents: AllowanceComponentOption[];
}) {
  const [compState, compAction, compPending] = useActionState(updateEmployeeCompensationAction, initialState);
  const [allowState, allowAction, allowPending] = useActionState(upsertRecurringAllowanceAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteRecurringAllowanceAction, initialState);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <PortalSectionCard title="Compensation">
        <p className="mb-4 text-sm text-muted-foreground">
          EPF employee and employer rates apply to this staff member on the next payrun.
        </p>
        <form action={compAction} className="grid gap-4 md:grid-cols-2">
          <input name="employeeId" type="hidden" value={employeeId} />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Pay basis</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.payBasis}
              name="payBasis"
            >
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Basic salary (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.basicSalary}
              name="basicSalary"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Hourly rate (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.hourlyRate ?? ""}
              name="hourlyRate"
              step="0.0001"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Daily rate (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.dailyRate ?? ""}
              name="dailyRate"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Extra EPF on top of statutory (%)</span>
            <p className="text-xs text-muted-foreground">
              Added to the employee EPF rate below. Employee total rate = statutory + extra.
            </p>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.voluntaryEpfExtraRate}
              name="voluntaryEpfExtraRate"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">EPF employee rate — statutory (%)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.epfEmployeeRate}
              max={100}
              min={0}
              name="epfEmployeeRate"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">EPF employer rate (%)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.epfEmployerRate}
              max={100}
              min={0}
              name="epfEmployerRate"
              step="0.01"
              type="number"
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              className="size-4 rounded border border-input"
              defaultChecked={compensation.eisEligible}
              name="eisEligible"
              type="checkbox"
            />
            <span className="text-muted-foreground">EIS eligible</span>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">SOCSO category override</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={compensation.socsoCategoryOverride ?? ""}
              name="socsoCategoryOverride"
            >
              <option value="">Auto (by age)</option>
              <option value="cat1">Category 1</option>
              <option value="cat2">Category 2</option>
            </select>
          </label>
          <div className="md:col-span-2 space-y-2">
            <HrFormMessage error={compState.error} success={compState.success} />
            <HrPrimaryButton disabled={compPending} type="submit">
              {compPending ? "Saving…" : "Save compensation"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>

      <PortalSectionCard title="Recurring allowances">
        {allowances.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {allowances.map((allowance) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                key={allowance.id}
              >
                <div>
                  <p className="font-medium">
                    {allowance.componentName}{" "}
                    <span className="text-muted-foreground">({allowance.componentCode})</span>
                  </p>
                  <p className="text-muted-foreground">
                    RM {allowance.amount.toFixed(2)} · from {allowance.effectiveFrom}
                    {allowance.effectiveTo ? ` to ${allowance.effectiveTo}` : ""}
                  </p>
                </div>
                <form action={deleteAction}>
                  <input name="allowanceId" type="hidden" value={allowance.id} />
                  <input name="employeeId" type="hidden" value={employeeId} />
                  <HrGhostButton disabled={deletePending} type="submit">
                    Remove
                  </HrGhostButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No recurring allowances configured.</p>
        )}

        <form action={allowAction} className="grid gap-4 md:grid-cols-2">
          <input name="employeeId" type="hidden" value={employeeId} />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Allowance type</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              name="componentId"
              required
            >
              <option value="">Select allowance</option>
              {allowanceComponents.map((component) => (
                <option key={component.id} value={component.id}>
                  {component.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Amount (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              min="0"
              name="amount"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Effective from</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={today}
              name="effectiveFrom"
              required
              type="date"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Effective to (optional)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              name="effectiveTo"
              type="date"
            />
          </label>
          <div className="md:col-span-2 space-y-2">
            <HrFormMessage error={allowState.error ?? deleteState.error} success={allowState.success ?? deleteState.success} />
            <HrPrimaryButton disabled={allowPending || allowanceComponents.length === 0} type="submit">
              {allowPending ? "Adding…" : "Add allowance"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>
    </div>
  );
}
