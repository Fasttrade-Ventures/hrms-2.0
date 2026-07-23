import { AuthShell } from "@/components/auth/auth-shell";

import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  return (
    <AuthShell
      brand={{
        headline: "Keep your\naccount secure.",
        subhead: "Use a strong password that you do not reuse on other sites.",
        rules: [
          "Minimum 8 characters",
          "At least one number",
          "At least one uppercase letter",
        ],
      }}
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
