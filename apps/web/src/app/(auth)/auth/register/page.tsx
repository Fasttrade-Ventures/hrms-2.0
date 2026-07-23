import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthCardHeader,
  AuthGhostButton,
} from "@/components/auth/auth-primitives";
import { isSaasMode } from "@hrms/platform";

import { RegisterForm } from "./register-form";

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
      <RegisterForm />
    </AuthShell>
  );
}
