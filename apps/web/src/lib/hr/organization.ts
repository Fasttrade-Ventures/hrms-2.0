import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }
  return organizationId;
}

export type OrgHubModule = {
  id: string;
  typeLabel: string;
  typeTone: "accent" | "success" | "warning" | "danger";
  title: string;
  subtitle: string;
  details: string;
  href: string;
  count: number;
};

export type OrgHubData = {
  branchCount: number;
  departmentCount: number;
  shiftCount: number;
  holidayCount: number;
  leaveTypeCount: number;
  modules: OrgHubModule[];
};

export type BranchRow = {
  id: string;
  name: string;
  weekendMode: "sat_sun" | "fri_sat" | "sun_only";
  payrollCutoffDay: number;
  employeeCount: number;
  createdAt: string;
};

export type DepartmentRow = {
  id: string;
  name: string;
  branchId: string | null;
  branchName: string | null;
  employeeCount: number;
  createdAt: string;
};

export type ShiftRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  employeeCount: number;
  createdAt: string;
};

export type HolidayRow = {
  id: string;
  name: string;
  holidayDate: string;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
};

export type LeaveTypeRow = {
  id: string;
  name: string;
  entitlementDays: number;
  requiresAttachment: boolean;
  isUnpaid: boolean;
  requestCount: number;
  createdAt: string;
};

function weekendLabel(mode: BranchRow["weekendMode"]) {
  switch (mode) {
    case "fri_sat":
      return "Fri–Sat";
    case "sun_only":
      return "Sun only";
    default:
      return "Sat–Sun";
  }
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

export async function getOrgHubData(): Promise<OrgHubData> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const year = new Date().getFullYear();

  const [branches, departments, shifts, holidays, leaveTypes] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name", { count: "exact" })
      .eq("organization_id", organizationId),
    supabase
      .from("departments")
      .select("id, name", { count: "exact" })
      .eq("organization_id", organizationId),
    supabase
      .from("shifts")
      .select("id, name", { count: "exact" })
      .eq("organization_id", organizationId),
    supabase
      .from("holidays")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .gte("holiday_date", `${year}-01-01`)
      .lte("holiday_date", `${year}-12-31`),
    supabase
      .from("leave_types")
      .select("id, name", { count: "exact" })
      .eq("organization_id", organizationId),
  ]);

  if (branches.error) throw new Error(branches.error.message);
  if (departments.error) throw new Error(departments.error.message);
  if (shifts.error) throw new Error(shifts.error.message);
  if (holidays.error) throw new Error(holidays.error.message);
  if (leaveTypes.error) throw new Error(leaveTypes.error.message);

  const branchCount = branches.count ?? branches.data?.length ?? 0;
  const departmentCount = departments.count ?? departments.data?.length ?? 0;
  const shiftCount = shifts.count ?? shifts.data?.length ?? 0;
  const holidayCount = holidays.count ?? holidays.data?.length ?? 0;
  const leaveTypeCount = leaveTypes.count ?? leaveTypes.data?.length ?? 0;

  const branchNames = (branches.data ?? []).map((row) => row.name).slice(0, 3).join(" · ") || "No branches yet";
  const deptNames = (departments.data ?? []).map((row) => row.name).slice(0, 4).join(" · ") || "No departments yet";
  const shiftNames = (shifts.data ?? []).map((row) => row.name).slice(0, 2).join(" · ") || "No shifts yet";
  const leaveNames = (leaveTypes.data ?? []).map((row) => row.name).slice(0, 3).join(" · ") || "No leave types yet";

  return {
    branchCount,
    departmentCount,
    shiftCount,
    holidayCount,
    leaveTypeCount,
    modules: [
      {
        id: "branches",
        typeLabel: "Branches",
        typeTone: "accent",
        title: "Branch sites",
        subtitle: `${branchCount} location${branchCount === 1 ? "" : "s"}`,
        details: branchNames,
        href: "/hr/organization/branches",
        count: branchCount,
      },
      {
        id: "departments",
        typeLabel: "Depts",
        typeTone: "success",
        title: "Departments",
        subtitle: `${departmentCount} team${departmentCount === 1 ? "" : "s"}`,
        details: deptNames,
        href: "/hr/organization/departments",
        count: departmentCount,
      },
      {
        id: "shifts",
        typeLabel: "Shifts",
        typeTone: "accent",
        title: "Work shifts",
        subtitle: `${shiftCount} pattern${shiftCount === 1 ? "" : "s"}`,
        details: shiftNames,
        href: "/hr/organization/shifts",
        count: shiftCount,
      },
      {
        id: "holidays",
        typeLabel: "Holiday",
        typeTone: "warning",
        title: "Holiday calendar",
        subtitle: `${year} gazette`,
        details: `${holidayCount} public + company day${holidayCount === 1 ? "" : "s"}`,
        href: "/hr/organization/holidays",
        count: holidayCount,
      },
      {
        id: "leave-types",
        typeLabel: "Leave",
        typeTone: "danger",
        title: "Leave types",
        subtitle: `${leaveTypeCount} polic${leaveTypeCount === 1 ? "y" : "ies"}`,
        details: leaveNames,
        href: "/hr/organization/leave-types",
        count: leaveTypeCount,
      },
    ],
  };
}

export async function listBranches(): Promise<BranchRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [{ data, error }, { data: employees, error: employeeError }] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name, weekend_mode, payroll_cutoff_day, created_at")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase.from("employees").select("branch_id").eq("organization_id", organizationId),
  ]);

  if (error) throw new Error(error.message);
  if (employeeError) throw new Error(employeeError.message);

  const counts = new Map<string, number>();
  for (const row of employees ?? []) {
    if (!row.branch_id) continue;
    counts.set(row.branch_id, (counts.get(row.branch_id) ?? 0) + 1);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    weekendMode: row.weekend_mode,
    payrollCutoffDay: row.payroll_cutoff_day,
    employeeCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}

export async function getBranch(branchId: string): Promise<BranchRow | null> {
  const branches = await listBranches();
  return branches.find((row) => row.id === branchId) ?? null;
}

export async function listDepartments(): Promise<DepartmentRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [{ data, error }, { data: employees, error: employeeError }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, branch_id, created_at, branches(name)")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase.from("employees").select("department_id").eq("organization_id", organizationId),
  ]);

  if (error) throw new Error(error.message);
  if (employeeError) throw new Error(employeeError.message);

  const counts = new Map<string, number>();
  for (const row of employees ?? []) {
    if (!row.department_id) continue;
    counts.set(row.department_id, (counts.get(row.department_id) ?? 0) + 1);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    branchId: row.branch_id,
    branchName: (row.branches as { name?: string } | null)?.name ?? null,
    employeeCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}

export async function getDepartment(departmentId: string): Promise<DepartmentRow | null> {
  const departments = await listDepartments();
  return departments.find((row) => row.id === departmentId) ?? null;
}

export async function listShifts(): Promise<ShiftRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [{ data, error }, { data: employees, error: employeeError }] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, name, start_time, end_time, grace_minutes, created_at")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase.from("employees").select("shift_id").eq("organization_id", organizationId),
  ]);

  if (error) throw new Error(error.message);
  if (employeeError) throw new Error(employeeError.message);

  const counts = new Map<string, number>();
  for (const row of employees ?? []) {
    if (!row.shift_id) continue;
    counts.set(row.shift_id, (counts.get(row.shift_id) ?? 0) + 1);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    graceMinutes: row.grace_minutes,
    employeeCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}

export async function getShift(shiftId: string): Promise<ShiftRow | null> {
  const shifts = await listShifts();
  return shifts.find((row) => row.id === shiftId) ?? null;
}

export async function listHolidays(year?: number): Promise<HolidayRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const selectedYear = year ?? new Date().getFullYear();

  const { data, error } = await supabase
    .from("holidays")
    .select("id, name, holiday_date, branch_id, created_at, branches(name)")
    .eq("organization_id", organizationId)
    .gte("holiday_date", `${selectedYear}-01-01`)
    .lte("holiday_date", `${selectedYear}-12-31`)
    .order("holiday_date");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    holidayDate: row.holiday_date,
    branchId: row.branch_id,
    branchName: (row.branches as { name?: string } | null)?.name ?? null,
    createdAt: row.created_at,
  }));
}

export async function getHoliday(holidayId: string): Promise<HolidayRow | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("holidays")
    .select("id, name, holiday_date, branch_id, created_at, branches(name)")
    .eq("organization_id", organizationId)
    .eq("id", holidayId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    holidayDate: data.holiday_date,
    branchId: data.branch_id,
    branchName: (data.branches as { name?: string } | null)?.name ?? null,
    createdAt: data.created_at,
  };
}

export async function listLeaveTypes(): Promise<LeaveTypeRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [{ data, error }, { data: requests, error: requestError }] = await Promise.all([
    supabase
      .from("leave_types")
      .select("id, name, entitlement_days, requires_attachment, is_unpaid, created_at")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase.from("leave_requests").select("leave_type_id").eq("organization_id", organizationId),
  ]);

  if (error) throw new Error(error.message);
  if (requestError) throw new Error(requestError.message);

  const counts = new Map<string, number>();
  for (const row of requests ?? []) {
    counts.set(row.leave_type_id, (counts.get(row.leave_type_id) ?? 0) + 1);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    entitlementDays: Number(row.entitlement_days ?? 0),
    requiresAttachment: row.requires_attachment,
    isUnpaid: row.is_unpaid,
    requestCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}

export async function getLeaveType(leaveTypeId: string): Promise<LeaveTypeRow | null> {
  const leaveTypes = await listLeaveTypes();
  return leaveTypes.find((row) => row.id === leaveTypeId) ?? null;
}

export async function listBranchOptions(): Promise<Array<{ id: string; name: string }>> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export { weekendLabel, formatTime, getOrganizationId };
