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
      shift_id,
      pay_group_id,
      employment_type,
      job_title,
      confirmation_status,
      annual_leave_entitlement,
      annual_leave_carry_forward,
      branches(name),
      departments(name),
      employee_profiles(
        phone,
        ic_number,
        date_of_birth,
        gender,
        race,
        religion,
        marital_status,
        residential_address,
        address_line1,
        address_line2,
        city,
        state,
        postcode,
        country,
        pay_basis,
        working_days_per_month,
        bank_name,
        bank_account_number,
        epf_number,
        socso_number,
        tax_number,
        basic_salary
      ),
      employee_emergency_contacts(id, name, relationship, phone),
      employee_dependents(id, dependent_type, full_name, ic_number, is_working, date_of_birth),
      employee_allowed_leave_types(leave_type_id),
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
    shiftId: employee.shift_id ?? null,
    payGroupId: employee.pay_group_id ?? null,
    employmentType: employee.employment_type ?? null,
    jobTitle: employee.job_title ?? null,
    confirmationStatus: employee.confirmation_status ?? null,
    annualLeaveEntitlement: Number(employee.annual_leave_entitlement ?? 14),
    annualLeaveCarryForward: Number(employee.annual_leave_carry_forward ?? 0),
    allowedLeaveTypeIds: (employee.employee_allowed_leave_types ?? []).map(
      (row: { leave_type_id: string }) => row.leave_type_id,
    ),
    branchName: (employee.branches as { name?: string } | null)?.name ?? null,
    departmentName: (employee.departments as { name?: string } | null)?.name ?? null,
    managerName,
    profile: {
      phone: profile?.phone ?? null,
      icNumber: profile?.ic_number ?? null,
      dateOfBirth: profile?.date_of_birth ?? null,
      gender: profile?.gender ?? null,
      race: profile?.race ?? null,
      religion: profile?.religion ?? null,
      maritalStatus: profile?.marital_status ?? null,
      residentialAddress: profile?.residential_address ?? null,
      addressLine1: profile?.address_line1 ?? null,
      addressLine2: profile?.address_line2 ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      postcode: profile?.postcode ?? null,
      country: profile?.country ?? null,
      payBasis: profile?.pay_basis ?? null,
      workingDaysPerMonth: Number(profile?.working_days_per_month ?? 21),
      bankName: profile?.bank_name ?? null,
      bankAccountNumber: profile?.bank_account_number ?? null,
      epfNumber: profile?.epf_number ?? null,
      socsoNumber: profile?.socso_number ?? null,
      taxNumber: profile?.tax_number ?? null,
      basicSalary: Number(profile?.basic_salary ?? 0),
    },
    dependents: (employee.employee_dependents ?? []).map(
      (dependent: {
        id: string;
        dependent_type: "spouse" | "child";
        full_name: string;
        ic_number: string | null;
        is_working: boolean | null;
        date_of_birth: string | null;
      }) => ({
        id: dependent.id,
        dependentType: dependent.dependent_type,
        fullName: dependent.full_name,
        icNumber: dependent.ic_number,
        isWorking: dependent.is_working,
        dateOfBirth: dependent.date_of_birth,
      }),
    ),
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
