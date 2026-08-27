"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { isSaasMode } from "@hrms/platform";

import { logAuthEvent } from "@/lib/audit/log-auth-event";
import { setActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { provisionTenant } from "@/lib/platform/provision-tenant";
import { checkRateLimitDurable } from "@/lib/rate-limit";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type RegisterState = {
  error?: string;
};

export async function registerOrganizationAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  if (!isSaasMode()) {
    return { error: "Registration is disabled in standalone mode." };
  }

  const company = String(formData.get("company") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!company || !fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";
  const limited = await checkRateLimitDurable(`register:${ip}`, 5, 60_000, 3_000);
  if (!limited.allowed) {
    return {
      error: `Too many registration attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Server configuration error." };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let organizationId: string;
  try {
    const result = await provisionTenant(admin, {
      company,
      fullName,
      email,
      password,
    });
    organizationId = result.organizationId;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Registration failed." };
  }

  const supabase = await createServerClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "Organization created but sign-in failed. Please sign in manually." };
  }

  await setActiveOrganizationCookie(organizationId);

  await logAuthEvent({
    action: "auth.register.succeeded",
    actorUserId: data.user?.id,
    organizationId,
    email,
    metadata: { company },
  });

  redirect("/owner/dashboard");
}
