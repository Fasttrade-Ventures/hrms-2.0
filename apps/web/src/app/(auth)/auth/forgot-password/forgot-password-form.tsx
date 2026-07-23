"use client";

import { useActionState, useEffect, useRef } from "react";

import { requestPasswordReset, type LoginState } from "../actions";

const initialState: LoginState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const submittedRef = useRef(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      submittedRef.current = true;
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  if (submittedRef.current && !state.error) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        If an account exists for that email, a reset link has been sent. Check your inbox.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
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

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
