"use client";

import { useActionState } from "react";

import { AuthError } from "@/components/auth/auth-icons";
import {
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
} from "@/components/auth/auth-primitives";
import { AuthPasswordField } from "@/components/auth/auth-password-field";

import { updatePassword, type LoginState } from "../actions";

const initialState: LoginState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <>
      <AuthCardHeader
        subtitle="This link expires in 1 hour. After saving, you’ll sign in with the new password."
        title="Set new password"
      />

      <form action={formAction} className="space-y-5">
        <AuthPasswordField
          autoComplete="new-password"
          id="password"
          label="New password"
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
          {pending ? "Saving…" : "Save password"}
        </AuthPrimaryButton>

        <AuthGhostButton href="/auth/login">Back to sign in</AuthGhostButton>
      </form>
    </>
  );
}
