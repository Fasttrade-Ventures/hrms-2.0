import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { selectMembershipRow, type MembershipRow } from "@/lib/auth/membership-selection";
import { getImpersonationOrgId } from "@/lib/platform/impersonation-cookie";
import { type SystemRole } from "@hrms/domain";

const ACTIVE_ORG_COOKIE = "hrms_active_org_id";

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

  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;
  const impersonateOrgId = await getImpersonationOrgId();
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, employee_id, roles, permissions")
    .eq("user_id", user.id);

  if (error || !memberships?.length) {
    return "/auth/login?error=no_membership";
  }

  const selected = selectMembershipRow(memberships as MembershipRow[], {
    deploymentMode,
    defaultOrgId,
    activeOrgId,
    impersonateOrgId,
  });

  if (!selected) {
    return "/auth/login?error=no_membership";
  }

  return dashboardPathForRoles(selected.roles ?? []);
}
