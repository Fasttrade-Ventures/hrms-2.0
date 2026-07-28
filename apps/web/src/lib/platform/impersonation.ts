import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isSaasMode } from "@hrms/platform";

import { logAuditEvent } from "@/lib/audit/log-event";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const IMPERSONATION_COOKIE = "hrms_impersonate_org_id";

export async function getImpersonationOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(IMPERSONATION_COOKIE)?.value ?? null;
}

export async function getImpersonationState(session: {
  membership: { roles: string[] };
}): Promise<{ organizationId: string; organizationName: string } | null> {
  if (!session.membership.roles.includes("platform_administrator")) return null;

  const organizationId = await getImpersonationOrgId();
  if (!organizationId) return null;

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
  const session = await requireRole("platform_administrator");
  const organizationId = await getImpersonationOrgId();

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);

  if (organizationId) {
    await logAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      action: "platform.impersonation_ended",
      resourceType: "organization",
      resourceId: organizationId,
    });
  }

  redirect("/platform/tenants");
}
