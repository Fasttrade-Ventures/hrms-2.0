"use client";

import { useActionState, useEffect, useRef } from "react";

import { AuthError, MailIcon } from "@/components/auth/auth-icons";
import {
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-primitives";

import { requestPasswordReset, type LoginState } from "../actions";

const initialState: LoginState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const submittedRef = useRef(false);
  const wasPending = useRef(false);
  const submittedEmail = useRef("");

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      submittedRef.current = true;
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  if (submittedRef.current && !state.error) {
    return (
      <div className="space-y-6">
        <div className="flex h-14 w-14 items-center justify-center bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]">
          <MailIcon />
        </div>
        <AuthCardHeader
          subtitle={`If an account exists for ${submittedEmail.current || "that email"}, you’ll receive an email with a password reset link shortly.`}
          title="Reset link sent"
        />
        <AuthGhostButton href="/auth/login">Return to sign in</AuthGhostButton>
      </div>
    );
  }

  return (
    <>
      <AuthCardHeader
        subtitle="Enter your email and we’ll send reset instructions if an account exists."
        title="Forgot password"
      />

      <form
        action={formAction}
        className="space-y-5"
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          submittedEmail.current = String(formData.get("email") ?? "");
        }}
      >
        <AuthTextField
          autoComplete="email"
          id="email"
          label="Email address"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
        />

        {state.error ? <AuthError>{state.error}</AuthError> : null}

        <AuthPrimaryButton disabled={pending} type="submit">
          {pending ? "Sending…" : "Send reset link"}
        </AuthPrimaryButton>

        <AuthGhostButton href="/auth/login">Back to sign in</AuthGhostButton>
      </form>
    </>
  );
}
