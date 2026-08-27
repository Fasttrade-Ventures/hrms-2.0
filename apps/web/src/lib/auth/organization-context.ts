import { cookies } from "next/headers";

import { requireActiveSubscription } from "@/lib/billing/subscription-gate";
import { getImpersonationOrgId } from "@/lib/platform/impersonation-cookie";
import { getSession } from "@/lib/auth/session";

/** Cookie for multi-membership active organization (SaaS). */
export const ACTIVE_ORG_COOKIE = "hrms_active_org_id";

export async function getActiveOrganizationCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get?.(ACTIVE_ORG_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function setActiveOrganizationCookie(organizationId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Resolves the organization for the current request.
 * Priority: impersonation → standalone DEFAULT → active-org cookie (validated in session) → session membership.
 */
export async function getEffectiveOrganizationId(): Promise<string | null> {
  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  let impersonateOrgId: string | null = null;
  try {
    impersonateOrgId = await getImpersonationOrgId();
  } catch {
    impersonateOrgId = null;
  }

  if (impersonateOrgId) {
    return impersonateOrgId;
  }

  if (deploymentMode === "standalone") {
    return process.env.DEFAULT_ORGANIZATION_ID ?? null;
  }

  try {
    const session = await getSession();
    return session?.membership.organizationId ?? null;
  } catch {
    return null;
  }
}

/** Like getEffectiveOrganizationId but throws when unresolved. */
export async function requireOrganizationId(): Promise<string> {
  const organizationId = await getEffectiveOrganizationId();
  if (!organizationId) {
    throw new Error(
      process.env.DEPLOYMENT_MODE === "saas"
        ? "No organization in session. Sign in again or select an organization."
        : "DEFAULT_ORGANIZATION_ID is not configured.",
    );
  }
  return organizationId;
}

/**
 * Org id for mutating HR/payroll paths. Enforces SaaS subscription when billing is on.
 * Read paths should keep using `requireOrganizationId()` (no billing query).
 */
export async function requireOrganizationIdForWrite(): Promise<string> {
  const organizationId = await requireOrganizationId();
  await requireActiveSubscription(organizationId);
  return organizationId;
}
