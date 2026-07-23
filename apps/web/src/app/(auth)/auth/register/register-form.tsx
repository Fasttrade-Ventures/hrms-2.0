"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AuthCardHeader,
  AuthGhostButton,
  AuthPrimaryButton,
  AuthTextField,
} from "@/components/auth/auth-primitives";
import { AuthPasswordField } from "@/components/auth/auth-password-field";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: formData.get("company"),
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Registration failed.");
        return;
      }

      router.push("/auth/login?registered=1");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthCardHeader
        subtitle="Start on Core — a complete HRMS. Upgrade later for automation."
        title="Register organization"
      />

      <form className="space-y-4" onSubmit={onSubmit}>
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

        {error ? (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <AuthPrimaryButton disabled={loading} type="submit">
          {loading ? "Creating organization…" : "Create organization"}
        </AuthPrimaryButton>

        <AuthGhostButton
          onClick={() => router.push("/auth/login")}
          type="button"
        >
          Back to sign in
        </AuthGhostButton>
      </form>
    </>
  );
}
