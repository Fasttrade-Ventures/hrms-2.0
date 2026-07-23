/** Server-only repositories and generated database types. */

export type Organization = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  productTier: "core" | "professional" | "enterprise";
  createdAt: string;
};

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  employeeId: string | null;
  roles: string[];
  permissions: string[];
  branchId: string | null;
};

export type Employee = {
  id: string;
  organizationId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  branchId: string | null;
  departmentId: string | null;
  managerEmployeeId: string | null;
  status: "active" | "inactive" | "terminated";
  joinDate: string;
};

export const DB_PACKAGE = "@hrms/db" as const;
