"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import {
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-primitives";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import {
  registerOrganizationAction,
  type RegisterState,
} from "@/app/(auth)/auth/register/actions";
import { BILLING_PLAN_OPTIONS, formatRinggitFromSen } from "@/lib/billing/plans";

const initialState: RegisterState = {};

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerOrganizationAction, initialState);

  return (
    <>
      <AuthCardHeader
        subtitle="14-day Professional trial · pay via Billplz when ready"
        title="Register organization"
      />

      <form action={formAction} className="space-y-4">
        <AuthTextField id="company" label="Company name" name="company" required />
        <AuthTextField id="fullName" label="Your full name" name="fullName" required />
        <AuthTextField
          autoComplete="email"
          id="email"
          label="Work email"
          name="email"
          required
          type="email"
        />
        <AuthPasswordField id="password" label="Password" name="password" required />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Plan</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BILLING_PLAN_OPTIONS.map((plan) => (
              <label
                className="flex cursor-pointer flex-col rounded-[var(--radius-md)] border border-[var(--border-primary)] p-3 text-sm has-[:checked]:border-[var(--accent-primary)]"
                key={plan.tier}
              >
                <input
                  className="sr-only"
                  defaultChecked={plan.tier === "professional"}
                  name="planTier"
                  type="radio"
                  value={plan.tier}
                />
                <span className="font-medium">{plan.name}</span>
                <span className="text-[var(--foreground-muted)]">
                  {formatRinggitFromSen(plan.baseAmountSenMonthly)}/mo
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Billing interval</legend>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input defaultChecked name="billingInterval" type="radio" value="month" />
              Monthly
            </label>
            <label className="flex items-center gap-2">
              <input name="billingInterval" type="radio" value="year" />
              Annual (2 months free)
            </label>
          </div>
        </fieldset>

        {state.error ? (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {state.error}
          </p>
        ) : null}

        <AuthPrimaryButton disabled={pending} type="submit">
          {pending ? "Creating organization…" : "Start 14-day trial"}
        </AuthPrimaryButton>

        <AuthGhostButton onClick={() => router.push("/auth/login")} type="button">
          Back to sign in
        </AuthGhostButton>
      </form>
    </>
  );
}
