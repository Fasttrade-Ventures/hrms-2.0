"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthError } from "@/components/auth/auth-icons";
import {
  AuthCardFooter,
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-primitives";
import { AuthPasswordField } from "@/components/auth/auth-password-field";

import { activateAccount, type LoginState } from "../actions";

const initialState: LoginState = {};

export function ActivateAccountForm({
  email,
  defaultFullName,
}: {
  email: string;
  defaultFullName: string;
}) {
  const [state, formAction, pending] = useActionState(activateAccount, initialState);

  return (
    <>
      <AuthCardHeader
        subtitle="Complete your profile to finish onboarding."
        title="Activate account"
      />

      <form action={formAction} className="space-y-5">
        <AuthTextField
          defaultValue={defaultFullName}
          id="fullName"
          label="Full name"
          name="fullName"
          required
        />

        <AuthTextField
          defaultValue={email}
          id="email"
          label="Work email"
          muted
          readOnly
          type="email"
        />

        <AuthPasswordField
          autoComplete="new-password"
          id="password"
          label="Create password"
          name="password"
          required
        />

        <AuthPasswordField
          autoComplete="new-password"
          id="confirmPassword"
          label="Confirm password"
          name="confirmPassword"
          required
        />

        {state.error ? <AuthError>{state.error}</AuthError> : null}

        <AuthPrimaryButton disabled={pending} type="submit">
          {pending ? "Activating…" : "Activate and continue"}
        </AuthPrimaryButton>

        <AuthCardFooter>
          <p>By activating, you agree to company HR policies and acceptable use guidelines.</p>
        </AuthCardFooter>

        <Link className="block" href="/auth/login">
          <AuthGhostButton type="button">Back to sign in</AuthGhostButton>
        </Link>
      </form>
    </>
  );
}
