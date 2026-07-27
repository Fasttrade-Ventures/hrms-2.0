import type { ListEmployeesInput } from "@hrms/validation";

import { getEmployeeProfilePhotoUrl } from "@/lib/employees/profile-photo";
import { createClient } from "@/lib/supabase/server";

export type EmployeeListItem = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  status: "active" | "inactive" | "terminated";
  displayStatus: "active" | "inactive" | "terminated" | "on_leave";
  joinDate: string;
  branchId: string | null;
  branchName: string | null;
  departmentName: string | null;
  jobTitle: string | null;
  roleLabel: "Staff" | "Manager" | "Admin" | "Owner";
  hasLogin: boolean;
  profilePhotoUrl: string | null;
};

export type EmployeeDirectoryStats = {
  active: number;
  onLeave: number;
  invitesOpen: number;
};

export type EmployeeBranchFilter = {
  id: string;
  name: string;
  count: number;
};

export type EmployeeDirectoryResult = {
  employees: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: EmployeeDirectoryStats;
  branches: EmployeeBranchFilter[];
  inactiveCount: number;
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
  shiftId: string | null;
  payGroupId: string | null;
  employmentType: "full_time" | "part_time" | "contract" | "intern" | null;
  jobTitle: string | null;
  confirmationStatus: "probation" | "confirmed" | "contract" | null;
  annualLeaveEntitlement: number;
  annualLeaveCarryForward: number;
  allowedLeaveTypeIds: string[];
  branchName: string | null;
  departmentName: string | null;
  managerName: string | null;
  shiftName: string | null;
  payGroupName: string | null;
  allowedLeaveTypeNames: string[];
  profile: {
    phone: string | null;
    icNumber: string | null;
    dateOfBirth: string | null;
    gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
    race: string | null;
    religion: string | null;
    maritalStatus: "single" | "married" | "divorced" | "widowed" | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
    payBasis: "monthly" | "daily" | "hourly" | null;
    workingDaysPerMonth: number;
    bankName: string | null;
    bankAccountNumber: string | null;
    epfNumber: string | null;
    socsoNumber: string | null;
    taxNumber: string | null;
    basicSalary: number;
    profilePhotoPath: string | null;
    profilePhotoUrl: string | null;
  };
  dependents: Array<{
    id: string;
    dependentType: "spouse" | "child";
    fullName: string;
    icNumber: string | null;
    isWorking: boolean | null;
    dateOfBirth: string | null;
  }>;
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function roleLabelFromRoles(roles: string[] | null | undefined): EmployeeListItem["roleLabel"] {
  const set = new Set(roles ?? []);
  if (set.has("organization_owner") || set.has("platform_admin")) return "Owner";
  if (set.has("hr_administrator") || set.has("branch_admin") || set.has("director")) return "Admin";
  if (set.has("manager")) return "Manager";
  return "Staff";
}

type EmployeeRow = {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  status: "active" | "inactive" | "terminated";
  join_date: string;
  branch_id: string | null;
  job_title: string | null;
  branches: { name?: string } | null;
  departments: { name?: string } | null;
  organization_memberships: { user_id: string; roles: string[] | null } | Array<{
    user_id: string;
    roles: string[] | null;
  }> | null;
  employee_profiles:
    | { profile_photo_path: string | null }
    | Array<{ profile_photo_path: string | null }>
    | null;
};

function mapEmployeeRow(row: EmployeeRow, onLeaveIds: Set<string>): EmployeeListItem {
  const membership = Array.isArray(row.organization_memberships)
    ? row.organization_memberships[0]
    : row.organization_memberships;
  const status = row.status;
  const onLeave = status === "active" && onLeaveIds.has(row.id);
  const profile = Array.isArray(row.employee_profiles)
    ? row.employee_profiles[0]
    : row.employee_profiles;
  const profilePhotoPath = profile?.profile_photo_path ?? null;

  return {
    id: row.id,
    employeeNumber: row.employee_number,
    fullName: row.full_name,
    email: row.email,
    status,
    displayStatus: onLeave ? "on_leave" : status,
    joinDate: row.join_date,
    branchId: row.branch_id,
    branchName: row.branches?.name ?? null,
    departmentName: row.departments?.name ?? null,
    jobTitle: row.job_title?.trim() || null,
    roleLabel: roleLabelFromRoles(membership?.roles),
    hasLogin: Boolean(membership?.user_id),
    profilePhotoUrl: getEmployeeProfilePhotoUrl(profilePhotoPath),
  };
}

export async function listEmployees(filters: ListEmployeesInput): Promise<EmployeeListItem[]> {
  const result = await getEmployeeDirectory(filters);
  return result.employees;
}

export async function getEmployeeDirectory(filters: ListEmployeesInput): Promise<EmployeeDirectoryResult> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const today = todayIso();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [leaveRes, allForStatsRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("employee_id")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
    supabase
      .from("employees")
      .select(
        "id, status, branch_id, branches(name), organization_memberships(user_id)",
      )
      .eq("organization_id", organizationId)
      .neq("status", "terminated"),
  ]);

  const onLeaveIds = new Set((leaveRes.data ?? []).map((row) => row.employee_id));

  const statsRows = allForStatsRes.data ?? [];
  const activeCount = statsRows.filter((row) => row.status === "active").length;
  const inactiveCount = statsRows.filter((row) => row.status === "inactive").length;
  const onLeaveCount = statsRows.filter(
    (row) => row.status === "active" && onLeaveIds.has(row.id),
  ).length;
  const invitesOpen = statsRows.filter((row) => {
    const membership = Array.isArray(row.organization_memberships)
      ? row.organization_memberships[0]
      : row.organization_memberships;
    return row.status === "active" && !membership?.user_id;
  }).length;

  const branchCounts = new Map<string, EmployeeBranchFilter>();
  for (const row of statsRows) {
    if (row.status !== "active" || !row.branch_id) continue;
    const name = (row.branches as { name?: string } | null)?.name ?? "Branch";
    const existing = branchCounts.get(row.branch_id);
    if (existing) {
      existing.count += 1;
    } else {
      branchCounts.set(row.branch_id, { id: row.branch_id, name, count: 1 });
    }
  }

  let query = supabase
    .from("employees")
    .select(
      "id, employee_number, full_name, email, status, join_date, branch_id, job_title, branches(name), departments(name), organization_memberships(user_id, roles), employee_profiles(profile_photo_path)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true })
    .range(from, to);

  if (filters.status === "inactive") {
    query = query.eq("status", "inactive");
  } else if (filters.status === "terminated") {
    query = query.eq("status", "terminated");
  } else if (filters.status === "all") {
    query = query.neq("status", "terminated");
  } else {
    query = query.eq("status", "active");
  }

  if (filters.branchId && filters.branchId !== "all") {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.search?.trim()) {
    const raw = filters.search.trim().replace(/[%_,."]/g, "");
    const term = `%${raw}%`;
    query = query.or(
      `full_name.ilike."${term}",email.ilike."${term}",employee_number.ilike."${term}"`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    employees: ((data ?? []) as EmployeeRow[]).map((row) => mapEmployeeRow(row, onLeaveIds)),
    total: count ?? 0,
    page,
    pageSize,
    stats: {
      active: activeCount,
      onLeave: onLeaveCount,
      invitesOpen,
    },
    branches: [...branchCounts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    inactiveCount,
  };
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
      shift_id,
      pay_group_id,
      employment_type,
      job_title,
      confirmation_status,
      annual_leave_entitlement,
      annual_leave_carry_forward,
      branches(name),
      departments(name),
      shifts(name),
      pay_groups(name),
      employee_profiles(
        phone,
        ic_number,
        date_of_birth,
        gender,
        race,
        religion,
        marital_status,
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
        basic_salary,
        profile_photo_path
      ),
      employee_emergency_contacts(id, name, relationship, phone),
      employee_dependents(id, dependent_type, full_name, ic_number, is_working, date_of_birth),
      employee_allowed_leave_types(leave_type_id, leave_types(name)),
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
    shiftId: employee.shift_id,
    payGroupId: employee.pay_group_id,
    employmentType: employee.employment_type,
    jobTitle: employee.job_title,
    confirmationStatus: employee.confirmation_status,
    annualLeaveEntitlement: Number(employee.annual_leave_entitlement ?? 14),
    annualLeaveCarryForward: Number(employee.annual_leave_carry_forward ?? 0),
    allowedLeaveTypeIds: (employee.employee_allowed_leave_types ?? []).map(
      (row: { leave_type_id: string }) => row.leave_type_id,
    ),
    branchName: (employee.branches as { name?: string } | null)?.name ?? null,
    departmentName: (employee.departments as { name?: string } | null)?.name ?? null,
    managerName,
    shiftName: (employee.shifts as { name?: string } | null)?.name ?? null,
    payGroupName: (employee.pay_groups as { name?: string } | null)?.name ?? null,
    allowedLeaveTypeNames: (employee.employee_allowed_leave_types ?? [])
      .map((row: { leave_types?: { name?: string } | { name?: string }[] | null }) => {
        const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
        return leaveType?.name ?? null;
      })
      .filter((name): name is string => Boolean(name)),
    profile: {
      phone: profile?.phone ?? null,
      icNumber: profile?.ic_number ?? null,
      dateOfBirth: profile?.date_of_birth ?? null,
      gender: profile?.gender ?? null,
      race: profile?.race ?? null,
      religion: profile?.religion ?? null,
      maritalStatus: profile?.marital_status ?? null,
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
      profilePhotoPath: profile?.profile_photo_path ?? null,
      profilePhotoUrl: getEmployeeProfilePhotoUrl(profile?.profile_photo_path ?? null),
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

export async function listActiveEmployeesForSelect() {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("full_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEmployeeOptions() {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [branches, departments, managers, shifts, payGroups, leaveTypes] = await Promise.all([
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("departments").select("id, name, branch_id").eq("organization_id", organizationId).order("name"),
    supabase
      .from("employees")
      .select("id, full_name, employee_number")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("full_name"),
    supabase.from("shifts").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("pay_groups").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("leave_types").select("id, name").eq("organization_id", organizationId).order("name"),
  ]);

  return {
    branches: branches.data ?? [],
    departments: departments.data ?? [],
    managers: managers.data ?? [],
    shifts: shifts.data ?? [],
    payGroups: payGroups.data ?? [],
    leaveTypes: leaveTypes.data ?? [],
  };
}

export async function getSuggestedEmployeeNumber(): Promise<string> {
  const { getNextEmployeeNumber } = await import("./organization");
  return getNextEmployeeNumber(getOrganizationId());
}
