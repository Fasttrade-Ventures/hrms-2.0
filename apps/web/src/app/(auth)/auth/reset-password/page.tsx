import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Set a password with at least 8 characters.
        </p>
      </div>

      <ResetPasswordForm />

      <p className="text-center text-sm text-slate-600">
        <Link className="text-blue-600 hover:text-blue-700" href="/auth/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
