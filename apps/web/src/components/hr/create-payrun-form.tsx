"use client";

import { useActionState } from "react";

import { createPayrunAction, type HrActionState } from "@/app/(hr)/hr/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

export function CreatePayrunForm() {
  const now = new Date();
  const [state, action, pending] = useActionState(createPayrunAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <HrField id="periodYear" label="Year">
          <HrTextInput
            defaultValue={String(now.getFullYear())}
            id="periodYear"
            name="periodYear"
            required
            type="number"
          />
        </HrField>
        <HrField id="periodMonth" label="Month">
          <HrTextInput
            defaultValue={String(now.getMonth() + 1)}
            id="periodMonth"
            max={12}
            min={1}
            name="periodMonth"
            required
            type="number"
          />
        </HrField>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <HrField id="earningPeriodStart" label="Earning period start">
          <HrTextInput id="earningPeriodStart" name="earningPeriodStart" required type="date" />
        </HrField>
        <HrField id="earningPeriodEnd" label="Earning period end">
          <HrTextInput id="earningPeriodEnd" name="earningPeriodEnd" required type="date" />
        </HrField>
      </div>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Creating…" : "Create draft"}
      </HrPrimaryButton>
    </form>
  );
}
