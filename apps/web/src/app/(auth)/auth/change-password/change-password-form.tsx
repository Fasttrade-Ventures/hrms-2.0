"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthError } from "@/components/auth/auth-icons";
import {
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
} from "@/components/auth/auth-primitives";
import { AuthPasswordField } from "@/components/auth/auth-password-field";

import { changePassword, type LoginState } from "../actions";

const initialState: LoginState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <>
      <AuthCardHeader
        subtitle="Enter your current password, then choose a new one with at least 8 characters, one number, and one uppercase letter."
        title="Change password"
      />

      <form action={formAction} className="space-y-5">
        <AuthPasswordField
          autoComplete="current-password"
          id="currentPassword"
          label="Current password"
          name="currentPassword"
          required
        />

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

        <Link className="block" href="/">
          <AuthGhostButton type="button">Cancel</AuthGhostButton>
        </Link>
      </form>
    </>
  );
}
