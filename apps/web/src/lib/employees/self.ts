import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import type { EmployeeDetail } from "./queries";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }

  return organizationId;
}

export async function getCurrentEmployeeDetail(): Promise<EmployeeDetail | null> {
  const session = await requireAuth();
  const organizationId = getOrganizationId();

  if (!session.membership.employeeId) {
    return null;
  }

  const supabase = await createClient();
  const employeeId = session.membership.employeeId;

  const { data: employee, error } = await supabase
    .from("employees")
    .select(
      `
      id,
      employee_number,
      full_name,
      email,
      status,
      join_date,
      branch_id,
      department_id,
      manager_employee_id,
      branches(name),
      departments(name),
      employee_profiles(
        phone,
        ic_number,
        address_line1,
        address_line2,
        city,
        state,
        postcode,
        country,
        bank_name,
        bank_account_number,
        epf_number,
        socso_number,
        tax_number,
        basic_salary
      ),
      employee_emergency_contacts(id, name, relationship, phone),
      organization_memberships(user_id, roles)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!employee) {
    return null;
  }

  let managerName: string | null = null;

  if (employee.manager_employee_id) {
    const { data: manager } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", employee.manager_employee_id)
      .maybeSingle();

    managerName = manager?.full_name ?? null;
  }

  const profile = Array.isArray(employee.employee_profiles)
    ? employee.employee_profiles[0]
    : employee.employee_profiles;
  const membership = Array.isArray(employee.organization_memberships)
    ? employee.organization_memberships[0]
    : employee.organization_memberships;

  return {
    id: employee.id,
    employeeNumber: employee.employee_number,
    fullName: employee.full_name,
    email: employee.email,
    status: employee.status,
    joinDate: employee.join_date,
    branchId: employee.branch_id,
    departmentId: employee.department_id,
    managerEmployeeId: employee.manager_employee_id,
    branchName: (employee.branches as { name?: string } | null)?.name ?? null,
    departmentName: (employee.departments as { name?: string } | null)?.name ?? null,
    managerName,
    profile: {
      phone: profile?.phone ?? null,
      icNumber: profile?.ic_number ?? null,
      addressLine1: profile?.address_line1 ?? null,
      addressLine2: profile?.address_line2 ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      postcode: profile?.postcode ?? null,
      country: profile?.country ?? null,
      bankName: profile?.bank_name ?? null,
      bankAccountNumber: profile?.bank_account_number ?? null,
      epfNumber: profile?.epf_number ?? null,
      socsoNumber: profile?.socso_number ?? null,
      taxNumber: profile?.tax_number ?? null,
      basicSalary: Number(profile?.basic_salary ?? 0),
    },
    emergencyContacts: (employee.employee_emergency_contacts ?? []).map((contact) => ({
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
    })),
    membership: membership
      ? {
          userId: membership.user_id,
          roles: membership.roles ?? [],
        }
      : null,
  };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstNameFromFullName(fullName?: string, email?: string): string {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? "there";
  }

  return email?.split("@")[0] ?? "there";
}
