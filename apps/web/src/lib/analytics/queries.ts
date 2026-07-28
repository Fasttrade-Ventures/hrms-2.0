import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type HeadcountMetrics = {
  total: number;
  byBranch: Array<{ id: string; name: string; count: number }>;
  byDepartment: Array<{ id: string; name: string; count: number }>;
};

export type LeaveLiabilityMetrics = {
  totalRemainingDays: number;
  estimatedLiabilityRm: number;
};

export type PayrollCostMetrics = {
  lastPayrunLabel: string | null;
  lastPayrunGross: number;
  lastPayrunNet: number;
  ytdGross: number;
  ytdNet: number;
};

export type RecruitmentMetrics = {
  openRequisitions: number;
  activeCandidates: number;
};

export async function getHeadcountMetrics(): Promise<HeadcountMetrics> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, branch_id, department_id, branches(name), departments(name)")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const branchMap = new Map<string, { id: string; name: string; count: number }>();
  const deptMap = new Map<string, { id: string; name: string; count: number }>();

  for (const row of employees ?? []) {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    const department = Array.isArray(row.departments) ? row.departments[0] : row.departments;
    const branchId = row.branch_id ?? "unassigned";
    const branchName = (branch as { name?: string } | null)?.name ?? "Unassigned";
    const deptId = row.department_id ?? "unassigned";
    const deptName = (department as { name?: string } | null)?.name ?? "Unassigned";

    const b = branchMap.get(branchId) ?? { id: branchId, name: branchName, count: 0 };
    b.count += 1;
    branchMap.set(branchId, b);

    const d = deptMap.get(deptId) ?? { id: deptId, name: deptName, count: 0 };
    d.count += 1;
    deptMap.set(deptId, d);
  }

  return {
    total: employees?.length ?? 0,
    byBranch: [...branchMap.values()].sort((a, b) => b.count - a.count),
    byDepartment: [...deptMap.values()].sort((a, b) => b.count - a.count),
  };
}

export async function getLeaveLiabilityMetrics(): Promise<LeaveLiabilityMetrics> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [{ data: employees }, { data: types }, { data: requests }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, annual_leave_entitlement, employee_profiles(basic_salary, working_days_per_month)")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase.from("leave_types").select("id, entitlement_days").eq("organization_id", organizationId),
    supabase
      .from("leave_requests")
      .select("employee_id, days, status")
      .eq("organization_id", organizationId)
      .in("status", ["pending", "approved"]),
  ]);

  const annualEntitlement =
    types?.find((t) => t.id)?.entitlement_days ??
    Number(employees?.[0]?.annual_leave_entitlement ?? 14);

  let totalRemainingDays = 0;
  let estimatedLiabilityRm = 0;

  for (const employee of employees ?? []) {
    const usedAndPending = (requests ?? [])
      .filter((r) => r.employee_id === employee.id)
      .reduce((sum, r) => sum + Number(r.days ?? 0), 0);
    const entitlement = Number(employee.annual_leave_entitlement ?? annualEntitlement ?? 14);
    const remaining = Math.max(0, entitlement - usedAndPending);
    totalRemainingDays += remaining;

    const profile = Array.isArray(employee.employee_profiles)
      ? employee.employee_profiles[0]
      : employee.employee_profiles;
    const basicSalary = Number(profile?.basic_salary ?? 0);
    const workingDays = Number(profile?.working_days_per_month ?? 21) || 21;
    estimatedLiabilityRm += remaining * (basicSalary / workingDays);
  }

  return { totalRemainingDays, estimatedLiabilityRm: Math.round(estimatedLiabilityRm) };
}

export async function getPayrollCostMetrics(): Promise<PayrollCostMetrics> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const { data: lockedPayruns } = await supabase
    .from("payroll_payruns")
    .select("id, period_label, period_year, period_month")
    .eq("organization_id", organizationId)
    .eq("status", "locked")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  const lastPayrun = lockedPayruns?.[0] ?? null;
  let lastPayrunGross = 0;
  let lastPayrunNet = 0;

  if (lastPayrun) {
    const { data: items } = await supabase
      .from("payroll_payrun_items")
      .select("gross_pay, net_pay")
      .eq("payrun_id", lastPayrun.id);

    for (const item of items ?? []) {
      lastPayrunGross += Number(item.gross_pay ?? 0);
      lastPayrunNet += Number(item.net_pay ?? 0);
    }
  }

  const yearPayrunIds = (lockedPayruns ?? []).filter((p) => p.period_year === year).map((p) => p.id);
  let ytdGross = 0;
  let ytdNet = 0;

  if (yearPayrunIds.length > 0) {
    const { data: ytdItems } = await supabase
      .from("payroll_payrun_items")
      .select("gross_pay, net_pay")
      .in("payrun_id", yearPayrunIds);

    for (const item of ytdItems ?? []) {
      ytdGross += Number(item.gross_pay ?? 0);
      ytdNet += Number(item.net_pay ?? 0);
    }
  }

  return {
    lastPayrunLabel: lastPayrun?.period_label ?? null,
    lastPayrunGross,
    lastPayrunNet,
    ytdGross,
    ytdNet,
  };
}

export async function getRecruitmentMetrics(): Promise<RecruitmentMetrics> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [{ count: openRequisitions }, { count: activeCandidates }] = await Promise.all([
    supabase
      .from("job_requisitions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("stage", ["applied", "screening", "interview", "assessment", "offer"]),
  ]);

  return {
    openRequisitions: openRequisitions ?? 0,
    activeCandidates: activeCandidates ?? 0,
  };
}
