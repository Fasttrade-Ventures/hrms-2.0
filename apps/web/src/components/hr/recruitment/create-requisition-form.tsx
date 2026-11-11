"use client";

import { useActionState } from "react";

import {
  addCandidateAction,
  createRequisitionAction,
  type RecruitmentActionState,
} from "@/app/(hr)/hr/recruitment/actions";
import {
  HrFormMessage,
  HrPrimaryButton,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import {
  OrgSelectOption,
  RequisitionFormFields,
} from "@/components/hr/recruitment/requisition-form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: RecruitmentActionState = {};

export function CreateRequisitionForm({
  branches,
  departments,
}: {
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
}) {
  const [state, action, pending] = useActionState(createRequisitionAction, initialState);

  return (
    <PortalSectionCard title="New requisition">
      <form action={action} className="space-y-4">
        <RequisitionFormFields branches={branches} departments={departments} idPrefix="create-" />
        <HrFormMessage error={state.error} success={state.success} />
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Creating…" : "Create requisition"}
        </HrPrimaryButton>
      </form>
    </PortalSectionCard>
  );
}

export function AddCandidateForm({ requisitionId }: { requisitionId: string }) {
  const [state, action, pending] = useActionState(addCandidateAction, initialState);

  return (
    <PortalSectionCard title="Add candidate">
      <form action={action} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <input name="requisitionId" type="hidden" value={requisitionId} />
        <div>
          <label className="text-sm font-medium" htmlFor="fullName">
            Full name
          </label>
          <HrTextInput id="fullName" name="fullName" required />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <HrTextInput id="email" name="email" required type="email" />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="phone">
            Phone
          </label>
          <HrTextInput id="phone" name="phone" />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="source">
            Source
          </label>
          <HrTextInput id="source" name="source" placeholder="e.g. Referral, LinkedIn" />
        </div>
        <HrFormMessage error={state.error} success={state.success} />
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Adding…" : "Add candidate"}
        </HrPrimaryButton>
      </form>
    </PortalSectionCard>
  );
}
