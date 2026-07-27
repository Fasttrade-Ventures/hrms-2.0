"use client";

import { useActionState, useMemo, useState } from "react";

import { createPayrunAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import type { PayGroupOption } from "@/lib/payroll/queries";

const initialState: HrActionState = {};

function monthBounds(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  return {
    start: `${year}-${monthStr}-01`,
    end: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function CreatePayrunWizard({ payGroups }: { payGroups: PayGroupOption[] }) {
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [scope, setScope] = useState<"pay_group" | "org_wide">("org_wide");
  const [payGroupId, setPayGroupId] = useState("");

  const selectedPayGroup = payGroups.find((group) => group.id === payGroupId);
  const showPeriodWeek =
    selectedPayGroup?.cycle === "weekly" || selectedPayGroup?.cycle === "biweekly";

  const defaults = useMemo(() => monthBounds(periodYear, periodMonth), [periodYear, periodMonth]);
  const [state, action, pending] = useActionState(createPayrunAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <HrField id="payrunType" label="Payrun type">
          <HrSelect defaultValue="regular" id="payrunType" name="payrunType">
            <option value="regular">Regular</option>
            <option value="adjustment">Adjustment</option>
          </HrSelect>
        </HrField>
        <HrField id="scope" label="Scope">
          <HrSelect
            id="scope"
            name="scope"
            onChange={(event) => setScope(event.target.value as "pay_group" | "org_wide")}
            value={scope}
          >
            <option value="org_wide">Organisation-wide</option>
            <option value="pay_group">Pay group</option>
          </HrSelect>
        </HrField>
      </div>

      {scope === "pay_group" ? (
        <HrField hint="Only employees assigned to this pay group are included." id="payGroupId" label="Pay group">
          <HrSelect
            id="payGroupId"
            name="payGroupId"
            onChange={(event) => setPayGroupId(event.target.value)}
            required={scope === "pay_group"}
            value={payGroupId}
          >
            <option value="">Select pay group</option>
            {payGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.cycle}, cutoff day {group.cutoffDay})
              </option>
            ))}
          </HrSelect>
        </HrField>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <HrField id="periodYear" label="Period year">
          <HrTextInput
            id="periodYear"
            name="periodYear"
            onChange={(event) => setPeriodYear(Number(event.target.value))}
            required
            type="number"
            value={periodYear}
          />
        </HrField>
        <HrField id="periodMonth" label="Period month">
          <HrTextInput
            id="periodMonth"
            max={12}
            min={1}
            name="periodMonth"
            onChange={(event) => setPeriodMonth(Number(event.target.value))}
            required
            type="number"
            value={periodMonth}
          />
        </HrField>
      </div>

      {showPeriodWeek ? (
        <HrField
          hint="ISO week number (1–53) for weekly or bi-weekly pay groups."
          id="periodWeek"
          label="Period week"
        >
          <HrTextInput id="periodWeek" max={53} min={1} name="periodWeek" required type="number" />
        </HrField>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <HrField id="earningPeriodStart" label="Earning period start">
          <HrTextInput
            defaultValue={defaults.start}
            id="earningPeriodStart"
            key={`start-${defaults.start}`}
            name="earningPeriodStart"
            required
            type="date"
          />
        </HrField>
        <HrField id="earningPeriodEnd" label="Earning period end">
          <HrTextInput
            defaultValue={defaults.end}
            id="earningPeriodEnd"
            key={`end-${defaults.end}`}
            name="earningPeriodEnd"
            required
            type="date"
          />
        </HrField>
        <HrField id="payDate" label="Pay date">
          <HrTextInput
            defaultValue={defaults.end}
            id="payDate"
            key={`pay-${defaults.end}`}
            name="payDate"
            required
            type="date"
          />
        </HrField>
      </div>

      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Generating…" : "Generate draft payrun"}
      </HrPrimaryButton>
    </form>
  );
}
