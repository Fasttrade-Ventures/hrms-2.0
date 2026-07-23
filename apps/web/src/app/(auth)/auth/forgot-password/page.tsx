import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your work email and we&apos;ll send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-slate-600">
        <Link className="text-blue-600 hover:text-blue-700" href="/auth/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
