import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-primitives";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { isSaasMode } from "@hrms/platform";

const saasBrand = {
  headline: "Create your\norganization.",
  subhead:
    "You become the Organization Owner. Invite HR admins, managers, and employees after setup.",
  features: [
    "1 — Register company & owner account",
    "2 — Choose Core plan to start",
    "3 — Invite your first HR administrator",
  ],
} as const;

export default function RegisterPage() {
  if (!isSaasMode()) {
    return (
      <AuthShell
        brand={{
          headline: "Organization\nregistration",
          subhead:
            "Self-service registration is not available in standalone mode. Your HR administrator creates employee accounts.",
          centered: true,
        }}
      >
        <AuthCardHeader
          subtitle="Ask your HR administrator for an invitation, then activate your account from the email link."
          title="Invite only"
        />
        <Link className="block" href="/auth/login">
          <AuthGhostButton type="button">Back to sign in</AuthGhostButton>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell brand={saasBrand}>
      <AuthCardHeader
        subtitle="Start on Core — a complete HRMS. Upgrade later for automation."
        title="Register organization"
      />

      <form className="space-y-4">
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

        <div className="space-y-2">
          <label className="text-[13px] font-medium text-[var(--foreground-primary)]" htmlFor="size">
            Company size
          </label>
          <select
            className="h-12 w-full border border-[var(--border-primary)] bg-[var(--surface-card)] px-3.5 text-[15px] text-[var(--foreground-primary)] outline-none focus:border-[var(--border-focus)]"
            defaultValue="11-50"
            id="size"
            name="size"
          >
            <option value="1-10">1–10 employees</option>
            <option value="11-50">11–50 employees</option>
            <option value="51-200">51–200 employees</option>
            <option value="200+">200+ employees</option>
          </select>
        </div>

        <div className="space-y-2 border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground-primary)]">Core plan</p>
            <span className="font-mono text-[11px] font-semibold text-[var(--accent-primary)]">
              INCLUDED
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
            Complete HRMS: people, leave, attendance, claims, OT, basic payroll, documents, and
            appraisals.
          </p>
        </div>

        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
          <input
            className="mt-0.5 h-[18px] w-[18px] border border-[var(--border-primary)] accent-[var(--accent-primary)]"
            name="terms"
            required
            type="checkbox"
          />
          I agree to the Terms of Service and Privacy Policy.
        </label>

        <AuthPrimaryButton disabled type="submit">
          Create organization
        </AuthPrimaryButton>

        <p className="text-center text-[13px] text-[var(--foreground-secondary)]">
          Already have an account?{" "}
          <Link className="font-semibold text-[var(--accent-primary)]" href="/auth/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
