import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isSaasMode } from "@hrms/platform";

import { logAuditEvent } from "@/lib/audit/log-event";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

import { getImpersonationOrgId, IMPERSONATION_COOKIE } from "./impersonation-cookie";

export { IMPERSONATION_COOKIE, getImpersonationOrgId } from "./impersonation-cookie";

export async function getImpersonationState(session: {
  membership: { roles: string[]; permissions: string[] };
}): Promise<{ organizationId: string; organizationName: string } | null> {
  const organizationId = await getImpersonationOrgId();
  if (!organizationId) return null;
  if (!session.membership.permissions.includes("platform_impersonating")) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;

  return { organizationId: data.id, organizationName: data.name };
}

export async function startImpersonation(organizationId: string): Promise<void> {
  const session = await requireRole("platform_administrator");
  if (!isSaasMode()) {
    throw new Error("Impersonation is only available in SaaS deployment mode.");
  }

  const admin = createAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !org) {
    throw new Error("Organization not found.");
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "platform.impersonation_started",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { organizationName: org.name },
  });

  redirect("/owner/dashboard");
}

export async function stopImpersonation(): Promise<void> {
  const session = await requireAuth();
  const organizationId = await getImpersonationOrgId();

  if (!organizationId || !session.membership.permissions.includes("platform_impersonating")) {
    redirect("/unauthorized");
  }

  const cookieStore = await cookies();
  cookieStore.delete({ name: IMPERSONATION_COOKIE, path: "/" });

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "platform.impersonation_ended",
    resourceType: "organization",
    resourceId: organizationId,
  });

  redirect("/platform/tenants");
}
