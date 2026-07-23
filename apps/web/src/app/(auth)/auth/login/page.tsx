import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { isSaasMode } from "@hrms/platform";

import { LoginForm } from "./login-form";

const standaloneBrand = {
  headline: "People operations,\nbuilt for work.",
  subhead:
    "Leave, attendance, payroll, and approvals in one secure workplace system — ready for standalone or multi-company use.",
  features: [
    "Role-based access for every team",
    "Malaysia payroll with statutory compliance",
    "Mobile-friendly employee self-service",
  ],
} as const;

const saasBrand = {
  headline: "Run HR for\nevery company.",
  subhead:
    "Create your organization, invite your team, and manage leave, attendance, and Malaysia payroll in one place.",
  features: [
    "Start free with Core HRMS",
    "Upgrade to Professional automation anytime",
    "Invite employees with role-based access",
  ],
} as const;

export default function LoginPage() {
  const showRegister = isSaasMode();

  return (
    <AuthShell brand={showRegister ? saasBrand : standaloneBrand}>
      <Suspense fallback={<p className="text-sm text-[var(--foreground-muted)]">Loading…</p>}>
        <LoginForm showRegister={showRegister} />
      </Suspense>
    </AuthShell>
  );
}
