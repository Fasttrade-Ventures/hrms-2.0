import { AuthShell } from "@/components/auth/auth-shell";

import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      brand={{
        headline: "Reset access\nin minutes.",
        subhead:
          "We’ll email a secure reset link that expires in one hour. Use your registered work email.",
        note: "For security, we never confirm whether an email exists in the system.",
      }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
