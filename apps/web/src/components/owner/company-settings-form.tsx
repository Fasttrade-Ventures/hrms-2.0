"use client";

import { useActionState, useState } from "react";

import { isMalaysia } from "@hrms/domain";
import { AUSTRALIAN_STATE_VALUES } from "@hrms/validation";

import {
  updateCompanySettingsAction,
  type CompanySettingsState,
} from "@/app/(owner)/owner/actions";
import { HrField, HrSelect, HrTextInput } from "@/components/hr/employees/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MALAYSIAN_STATE_OPTIONS } from "@/lib/employees/malaysia-demographics";
import type { OwnerCompanySettings } from "@/lib/owner/entitlements";

const initialState: CompanySettingsState = {};

export function CompanySettingsForm({ settings }: { settings: OwnerCompanySettings }) {
  const [state, formAction, pending] = useActionState(updateCompanySettingsAction, initialState);
  const [country, setCountry] = useState<"MY" | "AU">(settings.country);
  const isMy = isMalaysia(country);
  const stateOptions: readonly string[] = isMy ? MALAYSIAN_STATE_OPTIONS : AUSTRALIAN_STATE_VALUES;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Company</CardTitle>
        <CardDescription>
          Country decides the currency, the state list and whether Malaysian statutory (EPF, SOCSO,
          EIS, PCB, HRDF) applies. Australian companies use AUD and a 7.6 hour standard day.
          Timezone follows the state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="country" label="Country">
              <HrSelect
                id="country"
                name="country"
                onChange={(event) => setCountry(event.target.value === "AU" ? "AU" : "MY")}
                value={country}
              >
                <option value="MY">Malaysia (MYR)</option>
                <option value="AU">Australia (AUD)</option>
              </HrSelect>
            </HrField>
            <HrField
              hint={
                isMy
                  ? "Optional for Malaysian companies."
                  : "State or territory of the head office branch."
              }
              id="state"
              label="State / territory"
            >
              <HrSelect
                defaultValue={
                  stateOptions.includes(settings.state) ? settings.state : ""
                }
                id="state"
                key={country}
                name="state"
              >
                <option value="">Not set</option>
                {stateOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </HrSelect>
            </HrField>
          </div>

          {!isMy ? (
            <HrField hint="11 digits. Spaces are ignored." id="abn" label="ABN">
              <HrTextInput
                defaultValue={settings.abn}
                id="abn"
                inputMode="numeric"
                name="abn"
                placeholder="12 345 678 901"
              />
            </HrField>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Save company"}
            </Button>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? (
              <p className="text-sm text-[var(--foreground-secondary)]">{state.success}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
