"use client";

import { useActionState } from "react";

import { publishAnnouncementAction, type HrActionState } from "@/app/(hr)/hr/actions";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

export function PublishAnnouncementForm() {
  const [state, action, pending] = useActionState(publishAnnouncementAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <HrField id="title" label="Title">
        <HrTextInput id="title" name="title" required />
      </HrField>
      <HrField id="body" label="Message">
        <textarea
          className="min-h-[120px] w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-3 text-[15px] text-[var(--foreground-primary)] outline-none focus:border-[var(--border-focus)] focus:bg-[var(--surface-card)]"
          id="body"
          name="body"
          required
          rows={5}
        />
      </HrField>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Publishing…" : "Publish"}
      </HrPrimaryButton>
    </form>
  );
}
