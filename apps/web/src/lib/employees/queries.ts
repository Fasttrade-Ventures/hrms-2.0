import type { ListEmployeesInput } from "@hrms/validation";

import { createClient } from "@/lib/supabase/server";

export type EmployeeListItem = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  status: "active" | "inactive" | "terminated";
  joinDate: string;
  branchName: string | null;
  departmentName: string | null;
  hasLogin: boolean;
};

export type EmployeeDetail = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  status: "active" | "inactive" | "terminated";
  joinDate: string;
  branchId: string | null;
  departmentId: string | null;
  managerEmployeeId: string | null;
  branchName: string | null;
  departmentName: string | null;
  managerName: string | null;
  profile: {
    phone: string | null;
    icNumber: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    epfNumber: string | null;
    socsoNumber: string | null;
    taxNumber: string | null;
    basicSalary: number;
  };
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string | null;
    phone: string;
  }>;
  membership: {
    userId: string;
    roles: string[];
  } | null;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }

  return organizationId;
}

export async function listEmployees(filters: ListEmployeesInput): Promise<EmployeeListItem[]> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  let query = supabase
    .from("employees")
    .select("id, employee_number, full_name, email, status, join_date, branches(name), departments(name)")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},employee_number.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeNumber: row.employee_number,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    joinDate: row.join_date,
    branchName: (row.branches as { name?: string } | null)?.name ?? null,
    departmentName: (row.departments as { name?: string } | null)?.name ?? null,
    hasLogin: false,
  }));
}

export async function getEmployeeDetail(employeeId: string): Promise<EmployeeDetail | null> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

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

export async function getEmployeeOptions() {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [branches, departments, managers] = await Promise.all([
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("departments").select("id, name, branch_id").eq("organization_id", organizationId).order("name"),
    supabase
      .from("employees")
      .select("id, full_name, employee_number")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("full_name"),
  ]);

  return {
    branches: branches.data ?? [],
    departments: departments.data ?? [],
    managers: managers.data ?? [],
  };
}

export async function getSuggestedEmployeeNumber(): Promise<string> {
  const { getNextEmployeeNumber } = await import("./organization");
  return getNextEmployeeNumber(getOrganizationId());
}
