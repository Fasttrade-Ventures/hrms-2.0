"use client";

import { useActionState, type ReactNode } from "react";

import {
  updateEmployeePayrollDeclarationsAction,
  type EmployeeActionState,
} from "@/app/(employee)/employee/actions";
import type { EmployeePayrollDeclarations } from "@/lib/employee/payroll-declarations";

const initialState: EmployeeActionState = {};

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/\.?0+$/, "");
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">{children}</p>;
}

export function EmployeePayrollDeclarationsForm({
  declarations,
}: {
  declarations: EmployeePayrollDeclarations;
}) {
  const [state, action, pending] = useActionState(updateEmployeePayrollDeclarationsAction, initialState);
  const statutoryEpf = formatRate(declarations.epfEmployeeRate);

  return (
    <form
      action={action}
      className="space-y-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6"
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Tax & zakat</h2>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            These figures are used to calculate your monthly tax (PCB) and any zakat taken from salary.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground-primary)]">Annual zakat (RM)</span>
            <FieldHint>
              Total zakat you pay in a year. This lowers your monthly tax (PCB). Different from the
              monthly zakat deduction below.
            </FieldHint>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={declarations.zakatAnnual}
              min={0}
              name="zakatAnnual"
              step="0.01"
              type="number"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-[var(--foreground-primary)]">Monthly zakat from salary (RM)</span>
            <FieldHint>
              Fixed amount deducted from your pay each month for zakat payment. Taken after tax, not a
              tax rebate.
            </FieldHint>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={declarations.zakatMonthly}
              min={0}
              name="zakatMonthly"
              step="0.01"
              type="number"
            />
          </label>

          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium text-[var(--foreground-primary)]">
              Other annual tax reliefs (RM)
            </span>
            <FieldHint>
              Yearly total from your LHDN TP1 form for reliefs that are not zakat — for example
              medical expenses, life insurance, lifestyle, SSPN, and education fees. This reduces how
              much tax (PCB) is deducted each month. Enter 0 if none apply.
            </FieldHint>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 md:max-w-xs"
              defaultValue={declarations.otherReliefs}
              min={0}
              name="otherReliefs"
              step="0.01"
              type="number"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t border-[var(--border-primary)] pt-6">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">EPF savings</h2>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            You can choose to contribute more than the statutory EPF rate set by your employer.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-muted)]/40 px-4 py-3 text-sm">
          <p className="text-[var(--foreground-primary)]">
            Your statutory EPF rate: <strong>{statutoryEpf}%</strong>
          </p>
          <FieldHint>Set by HR. This is the minimum employee EPF percentage applied to your salary.</FieldHint>
        </div>

        <label className="block max-w-xs space-y-1.5 text-sm">
          <span className="font-medium text-[var(--foreground-primary)]">Extra EPF on top of statutory (%)</span>
          <FieldHint>
            Optional. Added to your {statutoryEpf}% statutory rate — e.g. enter 3 for a total of{" "}
            {formatRate(declarations.epfEmployeeRate + 3)}%. Enter 0 if you do not want extra
            contribution.
          </FieldHint>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-background px-3"
            defaultValue={declarations.voluntaryEpfExtraRate}
            max={100}
            min={0}
            name="voluntaryEpfExtraRate"
            step="0.01"
            type="number"
          />
        </label>
      </section>

      <div className="space-y-2 border-t border-[var(--border-primary)] pt-4">
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        <button
          className="inline-flex h-9 items-center rounded-md bg-[var(--accent-primary)] px-4 text-sm font-medium text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save payroll settings"}
        </button>
      </div>
    </form>
  );
}
