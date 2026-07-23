"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthDivider, AuthError } from "@/components/auth/auth-icons";
import {
  AuthCardFooter,
  AuthCardHeader,
  AuthCheckbox,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-primitives";
import { AuthLink, AuthPasswordField } from "@/components/auth/auth-password-field";

import { login, type LoginState } from "../actions";

const initialState: LoginState = {};

export function LoginForm({ showRegister }: { showRegister: boolean }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const authError = searchParams.get("error");
  const [state, formAction, pending] = useActionState(login, initialState);

  const errorMessage =
    state.error ??
    (authError === "no_membership"
      ? "Your account is not linked to an organization. Contact your HR administrator."
      : authError === "auth_callback_failed"
        ? "Sign-in link expired or is invalid. Try again."
        : authError === "invalid_link"
          ? "This link is invalid. Request a new one from your HR administrator."
          : undefined);

  return (
    <>
      <AuthCardHeader
        subtitle={
          showRegister
            ? "Access your organization workspace."
            : "Enter your work email to continue to your organization."
        }
        title="Sign in"
      />

      <form action={formAction} className="space-y-5">
        {next ? <input name="next" type="hidden" value={next} /> : null}

        <AuthTextField
          autoComplete="email"
          id="email"
          label="Email address"
          muted
          name="email"
          placeholder="you@company.com"
          required
          type="email"
        />

        <AuthPasswordField
          action={<AuthLink href="/auth/forgot-password">Forgot password?</AuthLink>}
          autoComplete="current-password"
          id="password"
          label="Password"
          name="password"
          required
        />

        <AuthCheckbox defaultChecked id="remember" label="Keep me signed in for 30 days" name="remember" />

        {errorMessage ? <AuthError>{errorMessage}</AuthError> : null}

        <AuthPrimaryButton disabled={pending} type="submit">
          {pending ? "Signing in…" : "Sign in"}
        </AuthPrimaryButton>

        {showRegister ? (
          <>
            <AuthDivider />
            <Link
              className="flex h-10 w-full items-center justify-center rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-[15px] font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-muted)]"
              href="/auth/register"
            >
              Create an organization
            </Link>
            <p className="text-center text-[13px] text-[var(--foreground-secondary)]">
              New here?{" "}
              <Link className="font-semibold text-[var(--accent-primary)]" href="/auth/register">
                Register your company
              </Link>
            </p>
            <p className="text-center text-[13px] text-[var(--foreground-muted)]">
              Already invited? Use the activation link from your email.
            </p>
          </>
        ) : (
          <AuthCardFooter>
            <p>Need an account? Ask your HR administrator for an invitation.</p>
            <p className="text-xs">Secured with organization-scoped access control.</p>
          </AuthCardFooter>
        )}
      </form>
    </>
  );
}
