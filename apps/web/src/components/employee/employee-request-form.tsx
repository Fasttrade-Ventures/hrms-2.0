"use client";

import { useActionState, type ReactNode } from "react";

import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

type EmployeeRequestFormProps = {
  title: string;
  description?: string;
  action: (prev: { error?: string; success?: string }, formData: FormData) => Promise<{ error?: string; success?: string }>;
  children: ReactNode;
  submitLabel?: string;
};

export function EmployeeRequestForm({
  title,
  description,
  action,
  children,
  submitLabel = "Submit",
}: EmployeeRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--foreground-secondary)]">{description}</p> : null}
      </div>

      {children}

      <HrFormMessage error={state.error} success={state.success} />

      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Submitting…" : submitLabel}
      </HrPrimaryButton>
    </form>
  );
}

export { HrField, HrSelect, HrTextInput };
