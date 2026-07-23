import Link from "next/link";

import { ResetPasswordForm } from "../reset-password/reset-password-form";

export default function ActivatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Activate your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Set your password to finish activating your HRMS account.
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
