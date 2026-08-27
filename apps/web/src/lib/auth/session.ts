import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { dashboardPathForRoles } from "@/lib/auth/redirect";
import { getImpersonationOrgId, IMPERSONATION_COOKIE } from "@/lib/platform/impersonation";
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

type MembershipRow = {
  organization_id: string;
  employee_id: string | null;
  roles: string[] | null;
  permissions: string[] | null;
};

/** Keep in sync with organization-context ACTIVE_ORG_COOKIE (avoid circular import). */
const ACTIVE_ORG_COOKIE = "hrms_active_org_id";

function mapMembership(row: MembershipRow): UserMembership {
  return {
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    roles: row.roles ?? [],
    permissions: row.permissions ?? [],
  };
}

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

  const platformMembership = memberships.find((row) => row.roles?.includes("platform_administrator"));

  if (impersonateOrgId && platformMembership) {
    return {
      organizationId: impersonateOrgId,
      employeeId: null,
      roles: ["organization_owner", "hr_administrator"],
      permissions: ["platform_impersonating"],
    };
  }

  if (deploymentMode === "standalone") {
    if (defaultOrgId) {
      const match = memberships.find((row) => row.organization_id === defaultOrgId);
      return match ? mapMembership(match) : null;
    }
    return mapMembership(memberships[0]!);
  }

  // SaaS: prefer active-org cookie when it matches a membership (never force DEFAULT).
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (activeOrgId) {
    const match = memberships.find((row) => row.organization_id === activeOrgId);
    if (match) return mapMembership(match);
  }

  return mapMembership(memberships[0]!);
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
  return data.map(mapMembership);
}

export function redirectToUserDashboard(roles: readonly string[]): never {
  redirect(dashboardPathForRoles([...roles]));
}

export { IMPERSONATION_COOKIE };
