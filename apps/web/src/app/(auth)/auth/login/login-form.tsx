"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { login, type LoginState } from "../actions";

const initialState: LoginState = {};

export function LoginForm() {
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
        : undefined);

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input name="next" type="hidden" value={next} /> : null}

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="email"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <Link
            className="text-sm text-blue-600 hover:text-blue-700"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
