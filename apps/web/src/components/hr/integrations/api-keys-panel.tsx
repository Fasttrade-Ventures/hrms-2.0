"use client";

import { useActionState } from "react";

import { revokeApiKeyAction, createApiKeyAction } from "@/app/(hr)/hr/integrations/api/actions";
import { HrFormMessage, HrPrimaryButton, HrTextInput } from "@/components/hr/employees/form-fields";

export function ApiKeysPanel({
  keys,
}: {
  keys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
  }>;
}) {
  const [state, action, pending] = useActionState(createApiKeyAction, {});

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-4 rounded-xl border p-5">
        <div>
          <label className="text-sm font-medium" htmlFor="name">
            Key name
          </label>
          <HrTextInput id="name" name="name" placeholder="ERP integration" required />
        </div>
        <HrFormMessage error={state.error} success={state.success} />
        {state.secret ? (
          <p className="rounded-lg bg-muted p-3 font-mono text-xs break-all">{state.secret}</p>
        ) : null}
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Creating…" : "Create API key"}
        </HrPrimaryButton>
      </form>

      <ul className="space-y-3">
        {keys.map((key) => (
          <li className="flex items-center justify-between rounded-lg border p-3 text-sm" key={key.id}>
            <div>
              <p className="font-medium">{key.name}</p>
              <p className="text-muted-foreground">{key.key_prefix}…</p>
            </div>
            {!key.revoked_at ? (
              <form action={revokeApiKeyAction.bind(null, key.id)}>
                <HrPrimaryButton type="submit">Revoke</HrPrimaryButton>
              </form>
            ) : (
              <span className="text-muted-foreground">Revoked</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
