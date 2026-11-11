"use client";

import { useActionState } from "react";

import {
  saveOrganizationLetterContactsAction,
  type LetterActionState,
} from "@/app/(hr)/hr/letters/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: LetterActionState = {};

export function OrganizationLetterContactsSection({
  companyEmail,
  companyPhone,
}: {
  companyEmail: string | null;
  companyPhone: string | null;
}) {
  const [state, action, pending] = useActionState(saveOrganizationLetterContactsAction, initialState);

  return (
    <PortalSectionCard
      description="Used by {{company_email}} and {{company_phone}} in letter templates."
      title="Company contact on letters"
    >
      <form action={action} className="space-y-4">
        <HrField id="company-email" label="Company email">
          <HrTextInput
            defaultValue={companyEmail ?? ""}
            id="company-email"
            name="companyEmail"
            placeholder="hr@company.com"
            type="email"
          />
        </HrField>
        <HrField id="company-phone" label="Company phone">
          <HrTextInput
            defaultValue={companyPhone ?? ""}
            id="company-phone"
            name="companyPhone"
            placeholder="+60 3 1234 5678"
          />
        </HrField>
        <HrFormMessage error={state.error} success={state.success} />
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Saving…" : "Save contacts"}
        </HrPrimaryButton>
      </form>
    </PortalSectionCard>
  );
}
