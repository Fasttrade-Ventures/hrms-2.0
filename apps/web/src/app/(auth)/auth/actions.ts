"use server";

import { redirect } from "next/navigation";

import { logAuthEvent } from "@/lib/audit/log-auth-event";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { canAccessPortal, isSafeInternalPath } from "@/lib/auth/routes";
import { getMembershipRoles } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }

  return null;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logAuthEvent({
      action: "auth.login.failed",
      email,
      metadata: { reason: error.message, remember },
    });
    return { error: error.message };
  }

  await logAuthEvent({
    action: "auth.login.succeeded",
    actorUserId: data.user?.id,
    email,
    metadata: { remember },
  });

  const next = String(formData.get("next") ?? "").trim();
  let destination = await resolvePostLoginPath(supabase);

  if (next && isSafeInternalPath(next)) {
    const roles = data.user ? await getMembershipRoles(data.user.id) : [];
    if (canAccessPortal(next, roles)) {
      destination = next;
    }
  }

  redirect(destination);
}

export async function requestPasswordReset(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  await logAuthEvent({
    action: "auth.password.reset_requested",
    email,
  });

  return {};
}

export async function updatePassword(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  await logAuthEvent({
    action: "auth.password.updated",
    actorUserId: user?.id,
    email: user?.email,
    metadata: { flow: "reset_or_activate" },
  });

  redirect(await resolvePostLoginPath(supabase));
}

export async function activateAccount(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your activation link has expired. Ask HR to resend the invitation." };
  }

  const { error } = await supabase.auth.updateUser({
    password,
    data: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    return { error: error.message };
  }

  // Reactivate employee record in database if status is inactive
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("employee_id, organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) {
    await supabase
      .from("employees")
      .update({ status: "active" })
      .eq("id", membership.employee_id)
      .eq("organization_id", membership.organization_id)
      .eq("status", "inactive");
  }

  await logAuthEvent({
    action: "auth.account.activated",
    actorUserId: user.id,
    email: user.email,
    metadata: { fullName: fullName || undefined },
  });

  redirect(await resolvePostLoginPath(supabase));
}

export async function changePassword(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    return { error: "Current password is required." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "You must be signed in to change your password." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  await logAuthEvent({
    action: "auth.password.changed",
    actorUserId: user.id,
    email: user.email,
  });

  redirect(await resolvePostLoginPath(supabase));
}
