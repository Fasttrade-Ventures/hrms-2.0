import type { SystemRole } from "@hrms/domain";

const ROLE_LABELS: Record<SystemRole, string> = {
  employee: "Employee",
  manager: "Manager",
  branch_admin: "Branch Admin",
  hr_administrator: "HR Administrator",
  director: "Director",
  organization_owner: "Organization Owner",
  platform_administrator: "Platform Administrator",
};

const ROLE_PRIORITY: SystemRole[] = [
  "platform_administrator",
  "organization_owner",
  "director",
  "hr_administrator",
  "branch_admin",
  "manager",
  "employee",
];

export function formatPrimaryRoleLabel(roles: readonly string[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return `Role assigned: ${ROLE_LABELS[role]}`;
    }
  }

  return "Role assigned: Employee";
}

export function formatRoleList(roles: readonly string[]): string {
  const labels = ROLE_PRIORITY.filter((role) => roles.includes(role)).map(
    (role) => ROLE_LABELS[role],
  );

  return labels.length > 0 ? labels.join(", ") : "Employee";
}
