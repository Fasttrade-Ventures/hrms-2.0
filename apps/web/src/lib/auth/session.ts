import { redirect } from "next/navigation";

import { dashboardPathForRoles } from "@/lib/auth/redirect";
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

async function loadMembership(userId: string): Promise<UserMembership | null> {
  const supabase = await createClient();
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;

  let query = supabase
    .from("organization_memberships")
    .select("organization_id, employee_id, roles, permissions")
    .eq("user_id", userId);

  if (defaultOrgId) {
    query = query.eq("organization_id", defaultOrgId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    organizationId: data.organization_id,
    employeeId: data.employee_id,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
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

export function redirectToUserDashboard(roles: readonly string[]): never {
  redirect(dashboardPathForRoles([...roles]));
}
