"use client";

import { useActionState } from "react";

import {
  createPayGroupAction,
  deletePayGroupAction,
  type HrActionState,
} from "@/app/(hr)/hr/payroll/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { PayGroupOption } from "@/lib/payroll/queries";

const initialState: HrActionState = {};

function DeletePayGroupButton({ payGroupId, name }: { payGroupId: string; name: string }) {
  const [state, action, pending] = useActionState(deletePayGroupAction, initialState);

  return (
    <form action={action} className="space-y-1">
      <input name="payGroupId" type="hidden" value={payGroupId} />
      <HrFormMessage error={state.error} success={state.success} />
      <button
        className="text-sm text-destructive hover:underline disabled:opacity-50"
        disabled={pending}
        onClick={(event) => {
          if (!confirm(`Delete pay group "${name}"?`)) event.preventDefault();
        }}
        type="submit"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}

export function PayGroupsPanel({ payGroups }: { payGroups: PayGroupOption[] }) {
  const [state, action, pending] = useActionState(createPayGroupAction, initialState);

  return (
    <div className="space-y-6">
      <PortalSectionCard description="Create a pay group for employees with the same pay frequency." title="Add pay group">
        <form action={action} className="grid gap-4 md:grid-cols-4">
          <HrField id="name" label="Name">
            <HrTextInput id="name" name="name" required />
          </HrField>
          <HrField id="cycle" label="Cycle">
            <HrSelect defaultValue="monthly" id="cycle" name="cycle">
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
            </HrSelect>
          </HrField>
          <HrField id="cutoffDay" label="Cutoff day">
            <HrTextInput defaultValue="6" id="cutoffDay" max={28} min={1} name="cutoffDay" required type="number" />
          </HrField>
          <div className="flex items-end space-y-2">
            <div className="w-full space-y-2">
              <HrFormMessage error={state.error} success={state.success} />
              <HrPrimaryButton className="w-full" disabled={pending} type="submit">
                {pending ? "Creating…" : "Create pay group"}
              </HrPrimaryButton>
            </div>
          </div>
        </form>
      </PortalSectionCard>

      <PortalSectionCard title={`Pay groups (${payGroups.length})`}>
        {payGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pay groups yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {payGroups.map((group) => (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={group.id}>
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.cycle} · cutoff day {group.cutoffDay}
                  </p>
                </div>
                <DeletePayGroupButton name={group.name} payGroupId={group.id} />
              </div>
            ))}
          </div>
        )}
      </PortalSectionCard>
    </div>
  );
}
