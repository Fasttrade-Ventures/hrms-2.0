import type { SupabaseClient } from "@supabase/supabase-js";

import { type SystemRole } from "@hrms/domain";

const ROLE_PRIORITY: SystemRole[] = [
  "platform_administrator",
  "organization_owner",
  "director",
  "hr_administrator",
  "branch_admin",
  "manager",
  "employee",
];

const ROLE_DASHBOARD: Record<SystemRole, string> = {
  platform_administrator: "/platform/dashboard",
  organization_owner: "/owner/dashboard",
  director: "/director/dashboard",
  hr_administrator: "/hr/dashboard",
  branch_admin: "/branch-admin/dashboard",
  manager: "/manager/dashboard",
  employee: "/employee/dashboard",
};

export function dashboardPathForRoles(roles: string[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return ROLE_DASHBOARD[role];
    }
  }

  return ROLE_DASHBOARD.employee;
}

export async function resolvePostLoginPath(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/auth/login";
  }

  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;

  let query = supabase.from("organization_memberships").select("roles").eq("user_id", user.id);

  if (defaultOrgId) {
    query = query.eq("organization_id", defaultOrgId);
  }

  const { data: memberships, error } = await query;

  if (error || !memberships?.length) {
    return "/auth/login?error=no_membership";
  }

  const roles = memberships.flatMap((membership) => membership.roles ?? []);
  return dashboardPathForRoles(roles);
}
