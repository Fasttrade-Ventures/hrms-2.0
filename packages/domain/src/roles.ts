export const SYSTEM_ROLES = [
  "employee",
  "manager",
  "branch_admin",
  "hr_administrator",
  "director",
  "organization_owner",
  "platform_administrator",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_SCOPES: Record<SystemRole, "self" | "team" | "branch" | "organization" | "platform"> = {
  employee: "self",
  manager: "team",
  branch_admin: "branch",
  hr_administrator: "organization",
  director: "organization",
  organization_owner: "organization",
  platform_administrator: "platform",
};

export const SPECIALIST_PERMISSIONS = [
  "payroll_processor",
  "payroll_approver",
  "recruiter",
  "document_custodian",
  "asset_manager",
  "auditor",
  "exporter",
  "integration_manager",
] as const;

export type SpecialistPermission = (typeof SPECIALIST_PERMISSIONS)[number];
