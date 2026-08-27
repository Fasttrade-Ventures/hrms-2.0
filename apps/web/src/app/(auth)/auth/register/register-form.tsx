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

const initialState: RegisterState = {};

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerOrganizationAction, initialState);

  return (
    <>
      <AuthCardHeader
        subtitle="Start on Core — a complete HRMS. Upgrade later for automation."
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

        {state.error ? (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {state.error}
          </p>
        ) : null}

        <AuthPrimaryButton disabled={pending} type="submit">
          {pending ? "Creating organization…" : "Create organization"}
        </AuthPrimaryButton>

        <AuthGhostButton onClick={() => router.push("/auth/login")} type="button">
          Back to sign in
        </AuthGhostButton>
      </form>
    </>
  );
}
