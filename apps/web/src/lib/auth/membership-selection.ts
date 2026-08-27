import type { UserMembership } from "@/lib/auth/session";

export type MembershipRow = {
  organization_id: string;
  employee_id: string | null;
  roles: string[] | null;
  permissions: string[] | null;
};

export function mapMembershipRow(row: MembershipRow): UserMembership {
  return {
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    roles: row.roles ?? [],
    permissions: row.permissions ?? [],
  };
}

export function buildImpersonationMembership(organizationId: string): UserMembership {
  return {
    organizationId,
    employeeId: null,
    roles: ["organization_owner", "hr_administrator"],
    permissions: ["platform_impersonating"],
  };
}

/**
 * Picks the active membership row for a user.
 * Standalone: DEFAULT org match, else first.
 * SaaS: active-org cookie match, else first (never force DEFAULT).
 */
export function selectMembershipRow(
  memberships: MembershipRow[],
  options: {
    deploymentMode?: string;
    defaultOrgId?: string | null;
    activeOrgId?: string | null;
    impersonateOrgId?: string | null;
  },
): MembershipRow | null {
  if (memberships.length === 0) return null;

  const deploymentMode = options.deploymentMode ?? "standalone";
  const defaultOrgId = options.defaultOrgId;
  const activeOrgId = options.activeOrgId;
  const impersonateOrgId = options.impersonateOrgId;

  const isPlatformAdmin = memberships.some((row) => row.roles?.includes("platform_administrator"));
  if (impersonateOrgId && isPlatformAdmin) {
    return {
      organization_id: impersonateOrgId,
      employee_id: null,
      roles: ["organization_owner", "hr_administrator"],
      permissions: ["platform_impersonating"],
    };
  }

  if (deploymentMode === "standalone") {
    if (defaultOrgId) {
      return memberships.find((row) => row.organization_id === defaultOrgId) ?? null;
    }
    return memberships[0] ?? null;
  }

  if (activeOrgId) {
    const match = memberships.find((row) => row.organization_id === activeOrgId);
    if (match) return match;
  }

  return memberships[0] ?? null;
}
