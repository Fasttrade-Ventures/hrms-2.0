"use client";

import { useActionState } from "react";

import { updatePassword, type LoginState } from "../actions";

const initialState: LoginState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          New password
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
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
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
