"use client";

import { useActionState } from "react";

import { HrFormMessage, HrPrimaryButton, HrTextInput } from "@/components/hr/employees/form-fields";
import { upsertWebhookEndpoint, WEBHOOK_EVENT_TYPES } from "@/lib/integrations/webhooks/queries";

export function WebhookEndpointForm() {
  const [state, action, pending] = useActionState(upsertWebhookEndpoint, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <HrTextInput id="name" name="name" required />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="url">
          URL
        </label>
        <HrTextInput id="url" name="url" required type="url" />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="secret">
          Signing secret
        </label>
        <HrTextInput id="secret" name="secret" type="password" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Events</legend>
        {WEBHOOK_EVENT_TYPES.map((event) => (
          <label className="flex items-center gap-2 text-sm" key={event}>
            <input name={`event_${event}`} type="checkbox" />
            {event}
          </label>
        ))}
      </fieldset>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Saving…" : "Save endpoint"}
      </HrPrimaryButton>
    </form>
  );
}
