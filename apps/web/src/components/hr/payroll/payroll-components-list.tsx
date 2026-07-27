"use client";

import { useActionState } from "react";

import { setPayrollComponentActiveAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

type PayrollComponentRow = {
  id: string;
  code: string;
  name: string;
  component_type: string;
  is_system: boolean;
  is_active: boolean;
};

function ComponentActiveToggle({
  component,
}: {
  component: Pick<PayrollComponentRow, "id" | "is_active" | "is_system">;
}) {
  const [state, action, pending] = useActionState(setPayrollComponentActiveAction, initialState);

  return (
    <form action={action} className="space-y-1">
      <input name="componentId" type="hidden" value={component.id} />
      <input name="isActive" type="hidden" value={component.is_active ? "false" : "true"} />
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending || component.is_system} type="submit">
        {pending ? "Saving…" : component.is_active ? "Deactivate" : "Activate"}
      </HrPrimaryButton>
    </form>
  );
}

export function PayrollComponentsList({ components }: { components: PayrollComponentRow[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">
        <p className="text-sm font-medium">Components ({components.length})</p>
      </div>
      <div className="divide-y divide-[var(--border-primary)]">
        {components.map((component) => (
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4" key={component.id}>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{component.code}</p>
              <p className="text-sm text-muted-foreground">
                {component.name} · {component.component_type}
                {component.is_system ? " · system" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{component.is_active ? "Active" : "Inactive"}</span>
              <ComponentActiveToggle component={component} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
