import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  mapMembershipRow,
  selectMembershipRow,
  type MembershipRow,
} from "@/lib/auth/membership-selection";
import { getImpersonationOrgId, IMPERSONATION_COOKIE } from "@/lib/platform/impersonation-cookie";
import { createClient } from "@/lib/supabase/server";

export type UserMembership = {
  organizationId: string;
  employeeId: string | null;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  user: {
    id: string;
    email: string | undefined;
    fullName: string | undefined;
  };
  membership: UserMembership;
};

/** Keep in sync with organization-context ACTIVE_ORG_COOKIE (avoid circular import). */
const ACTIVE_ORG_COOKIE = "hrms_active_org_id";

async function loadMembership(userId: string): Promise<UserMembership | null> {
  const supabase = await createClient();
  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;
  const impersonateOrgId = await getImpersonationOrgId();

  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, employee_id, roles, permissions")
    .eq("user_id", userId);

  if (error || !memberships?.length) {
    return null;
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  const selected = selectMembershipRow(memberships as MembershipRow[], {
    deploymentMode,
    defaultOrgId,
    activeOrgId,
    impersonateOrgId,
  });

  return selected ? mapMembershipRow(selected) : null;
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const membership = await loadMembership(user.id);

    if (!membership) {
      return null;
    }

    const metadata = user.user_metadata as { full_name?: string } | undefined;

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: metadata?.full_name,
      },
      membership,
    };
  } catch (err) {
    console.warn("[session] Could not retrieve session from Supabase:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return session;
}

export async function requireRole(...allowedRoles: string[]): Promise<AuthSession> {
  const session = await requireAuth();
  const hasRole = allowedRoles.some((role) => session.membership.roles.includes(role));

  if (!hasRole) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireRoleOrPermission(
  allowedRoles: string[],
  allowedPermissions: string[],
): Promise<AuthSession> {
  const session = await requireAuth();
  const hasRole = allowedRoles.some((role) => session.membership.roles.includes(role));
  const hasPermission = allowedPermissions.some((permission) =>
    session.membership.permissions.includes(permission),
  );

  if (!hasRole && !hasPermission) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireOrgMembership(): Promise<AuthSession> {
  return requireAuth();
}

export async function getMembershipRoles(userId: string): Promise<string[]> {
  const membership = await loadMembership(userId);
  return membership?.roles ?? [];
}

export async function listUserMemberships(userId: string): Promise<UserMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, employee_id, roles, permissions")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((row) => mapMembershipRow(row as MembershipRow));
}

export { IMPERSONATION_COOKIE };
