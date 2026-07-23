import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Organization registration
      </h1>
      <p className="text-sm text-slate-600">
        Self-service registration is not available in standalone mode. Your HR administrator
        creates employee accounts.
      </p>
      <Link className="text-sm text-blue-600 hover:text-blue-700" href="/auth/login">
        Back to sign in
      </Link>
    </div>
  );
}
