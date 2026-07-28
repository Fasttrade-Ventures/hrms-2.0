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
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: RecruitmentActionState = {};

export function CreateRequisitionForm() {
  const [state, action, pending] = useActionState(createRequisitionAction, initialState);

  return (
    <PortalSectionCard title="New requisition">
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="title">
            Title
          </label>
          <HrTextInput id="title" name="title" required />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="description"
            name="description"
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="headcount">
            Headcount
          </label>
          <HrTextInput defaultValue="1" id="headcount" min={1} name="headcount" type="number" />
        </div>
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
      <form action={action} className="grid gap-4 md:grid-cols-3">
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
        <HrFormMessage error={state.error} success={state.success} />
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Adding…" : "Add candidate"}
        </HrPrimaryButton>
      </form>
    </PortalSectionCard>
  );
}
