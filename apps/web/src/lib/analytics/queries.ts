import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";

import {
  addToMonthSeries,
  emptyMonthSeries,
  incrementNamedCount,
  sortedNamedCounts,
  type NamedCount,
} from "./bucket";
import {
  periodRange,
  toMonthKey,
  type AnalyticsFilterInput,
  type AnalyticsPeriod,
} from "./period";

export type HeadcountMetrics = {
  total: number;
  byBranch: NamedCount[];
  byDepartment: NamedCount[];
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

export type AnalyticsChartKey =
  | "headcount_branch"
  | "headcount_dept"
  | "joiners_leavers"
  | "leave_days"
  | "leave_liability"
  | "payroll_monthly"
  | "payroll_composition"
  | "recruitment_funnel"
  | "recruitment_open";

export type AnalyticsCockpit = {
  filters: AnalyticsFilterInput;
  kpis: {
    activeHeadcount: number;
    joiners: number;
    leavers: number;
    leaveLiabilityRm: number;
    leaveRemainingDays: number;
    lastPayrunNet: number;
    lastPayrunLabel: string | null;
    openRequisitions: number;
    activeCandidates: number;
  };
  headcountByBranch: NamedCount[];
  headcountByDepartment: NamedCount[];
  joinersLeaversByMonth: Array<Record<string, string | number>>;
  leaveDaysByMonth: Array<Record<string, string | number>>;
  leaveLiabilityByDepartment: NamedCount[];
  payrollByMonth: Array<Record<string, string | number>>;
  payrollComposition: Array<{ name: string; value: number }>;
  recruitmentByStage: Array<{ key: string; count: number }>;
  recruitmentOpenVsCandidates: Array<{ name: string; value: number }>;
};

export type AnalyticsDetail = {
  title: string;
  total: number;
  columns: string[];
  rows: Array<Record<string, string | number>>;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function matchesFilters(
  row: { branch_id?: string | null; department_id?: string | null },
  filters: AnalyticsFilterInput,
): boolean {
  if (filters.branchId && row.branch_id !== filters.branchId) return false;
  if (filters.departmentId && row.department_id !== filters.departmentId) return false;
  return true;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Legacy: active headcount snapshot (unfiltered period). */
export async function getHeadcountMetrics(): Promise<HeadcountMetrics> {
  const cockpit = await getAnalyticsCockpit({ period: "6m", branchId: null, departmentId: null });
  return {
    total: cockpit.kpis.activeHeadcount,
    byBranch: cockpit.headcountByBranch,
    byDepartment: cockpit.headcountByDepartment,
  };
}

export async function getLeaveLiabilityMetrics(): Promise<LeaveLiabilityMetrics> {
  const cockpit = await getAnalyticsCockpit({ period: "6m", branchId: null, departmentId: null });
  return {
    totalRemainingDays: cockpit.kpis.leaveRemainingDays,
    estimatedLiabilityRm: cockpit.kpis.leaveLiabilityRm,
  };
}

export async function getPayrollCostMetrics(): Promise<PayrollCostMetrics> {
  const organizationId = await requireOrganizationId();
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
  const organizationId = await requireOrganizationId();
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

export async function getAnalyticsCockpit(filters: AnalyticsFilterInput): Promise<AnalyticsCockpit> {
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const range = periodRange(filters.period);
  const startDate = isoDate(range.start);
  const endDate = isoDate(range.end);

  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select(
      "id, full_name, email, status, join_date, updated_at, branch_id, department_id, annual_leave_entitlement, branches(name), departments(name), employee_profiles(basic_salary, working_days_per_month)",
    )
    .eq("organization_id", organizationId);
  if (employeeError) throw new Error(employeeError.message);

  const filteredEmployees = (employees ?? []).filter((row) => matchesFilters(row, filters));
  const activeEmployees = filteredEmployees.filter((row) => row.status === "active");

  const branchMap = new Map<string, NamedCount>();
  const deptMap = new Map<string, NamedCount>();
  for (const row of activeEmployees) {
    const branch = pickOne(row.branches as { name?: string } | { name?: string }[] | null);
    const department = pickOne(row.departments as { name?: string } | { name?: string }[] | null);
    incrementNamedCount(branchMap, row.branch_id ?? "unassigned", branch?.name ?? "Unassigned");
    incrementNamedCount(deptMap, row.department_id ?? "unassigned", department?.name ?? "Unassigned");
  }

  const joinersLeaversByMonth = emptyMonthSeries(range.months, ["joiners", "leavers"]);
  let joiners = 0;
  let leavers = 0;
  for (const row of filteredEmployees) {
    const joinMonth = toMonthKey(row.join_date);
    if (joinMonth && row.join_date >= startDate && row.join_date <= endDate) {
      joiners += 1;
      addToMonthSeries(joinersLeaversByMonth, joinMonth, "joiners", 1);
    }
    // Best-effort exit proxy: no end_date column — use status + updated_at.
    if (row.status === "terminated" || row.status === "inactive") {
      const updated = String(row.updated_at ?? "").slice(0, 10);
      const leaveMonth = toMonthKey(updated);
      if (leaveMonth && updated >= startDate && updated <= endDate) {
        leavers += 1;
        addToMonthSeries(joinersLeaversByMonth, leaveMonth, "leavers", 1);
      }
    }
  }

  const employeeIds = filteredEmployees.map((row) => row.id);
  const { data: leaveRequests } = employeeIds.length
    ? await supabase
        .from("leave_requests")
        .select("employee_id, days, start_date, status")
        .eq("organization_id", organizationId)
        .in("employee_id", employeeIds)
        .in("status", ["pending", "approved"])
    : { data: [] as Array<{ employee_id: string; days: number; start_date: string; status: string }> };

  const leaveDaysByMonth = emptyMonthSeries(range.months, ["days"]);
  const usedByEmployee = new Map<string, number>();
  for (const row of leaveRequests ?? []) {
    usedByEmployee.set(row.employee_id, (usedByEmployee.get(row.employee_id) ?? 0) + Number(row.days ?? 0));
    const month = toMonthKey(row.start_date);
    if (month && row.start_date >= startDate && row.start_date <= endDate) {
      addToMonthSeries(leaveDaysByMonth, month, "days", Number(row.days ?? 0));
    }
  }

  let leaveRemainingDays = 0;
  let leaveLiabilityRm = 0;
  const liabilityByDept = new Map<string, NamedCount>();
  for (const employee of activeEmployees) {
    const usedAndPending = usedByEmployee.get(employee.id) ?? 0;
    const entitlement = Number(employee.annual_leave_entitlement ?? 14);
    const remaining = Math.max(0, entitlement - usedAndPending);
    leaveRemainingDays += remaining;
    const profile = pickOne(
      employee.employee_profiles as
        | { basic_salary?: number; working_days_per_month?: number }
        | { basic_salary?: number; working_days_per_month?: number }[]
        | null,
    );
    const basicSalary = Number(profile?.basic_salary ?? 0);
    const workingDays = Number(profile?.working_days_per_month ?? 21) || 21;
    const liability = remaining * (basicSalary / workingDays);
    leaveLiabilityRm += liability;
    const department = pickOne(employee.departments as { name?: string } | { name?: string }[] | null);
    incrementNamedCount(
      liabilityByDept,
      employee.department_id ?? "unassigned",
      department?.name ?? "Unassigned",
      Math.round(liability),
    );
  }

  const { data: lockedPayruns } = await supabase
    .from("payroll_payruns")
    .select("id, period_label, period_year, period_month")
    .eq("organization_id", organizationId)
    .eq("status", "locked")
    .order("period_year", { ascending: true })
    .order("period_month", { ascending: true });

  const payrollByMonth = emptyMonthSeries(range.months, ["gross", "net"]);
  const lastPayrun = [...(lockedPayruns ?? [])].reverse()[0] ?? null;
  let lastPayrunNet = 0;
  const payrollComposition: Array<{ name: string; value: number }> = [];

  if ((lockedPayruns ?? []).length > 0) {
    const { data: items } = await supabase
      .from("payroll_payrun_items")
      .select(
        "payrun_id, gross_pay, net_pay, epf_employee, socso_employee, eis_employee, pcb, employee_id, employees(branch_id, department_id)",
      )
      .in(
        "payrun_id",
        (lockedPayruns ?? []).map((p) => p.id),
      );

    const payrunMeta = new Map(
      (lockedPayruns ?? []).map((p) => [
        p.id,
        `${p.period_year}-${String(p.period_month).padStart(2, "0")}`,
      ]),
    );

    for (const item of items ?? []) {
      const employee = pickOne(
        item.employees as { branch_id?: string | null; department_id?: string | null } | null,
      );
      if (employee && !matchesFilters(employee, filters)) continue;
      const month = payrunMeta.get(item.payrun_id as string);
      if (month) {
        addToMonthSeries(payrollByMonth, month, "gross", Number(item.gross_pay ?? 0));
        addToMonthSeries(payrollByMonth, month, "net", Number(item.net_pay ?? 0));
      }
      if (lastPayrun && item.payrun_id === lastPayrun.id) {
        lastPayrunNet += Number(item.net_pay ?? 0);
      }
    }

    if (lastPayrun) {
      const lastItems = (items ?? []).filter((item) => item.payrun_id === lastPayrun.id);
      let gross = 0;
      let epf = 0;
      let socso = 0;
      let eis = 0;
      let pcb = 0;
      for (const item of lastItems) {
        const employee = pickOne(
          item.employees as { branch_id?: string | null; department_id?: string | null } | null,
        );
        if (employee && !matchesFilters(employee, filters)) continue;
        gross += Number(item.gross_pay ?? 0);
        epf += Number(item.epf_employee ?? 0);
        socso += Number(item.socso_employee ?? 0);
        eis += Number(item.eis_employee ?? 0);
        pcb += Number(item.pcb ?? 0);
      }
      payrollComposition.push(
        { name: "Gross", value: Math.round(gross) },
        { name: "EPF (EE)", value: Math.round(epf) },
        { name: "SOCSO (EE)", value: Math.round(socso) },
        { name: "EIS (EE)", value: Math.round(eis) },
        { name: "PCB", value: Math.round(pcb) },
      );
    }
  }

  let openRequisitions = 0;
  let activeCandidates = 0;
  const recruitmentByStage: Array<{ key: string; count: number }> = [];
  try {
    let requisitionQuery = supabase
      .from("job_requisitions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open");
    if (filters.branchId) requisitionQuery = requisitionQuery.eq("branch_id", filters.branchId);
    if (filters.departmentId) requisitionQuery = requisitionQuery.eq("department_id", filters.departmentId);
    const { count } = await requisitionQuery;
    openRequisitions = count ?? 0;

    const { data: applications } = await supabase
      .from("job_applications")
      .select("id, stage, job_requisitions(branch_id, department_id)")
      .eq("organization_id", organizationId)
      .in("stage", ["applied", "screening", "interview", "assessment", "offer", "hired", "rejected", "withdrawn"]);

    const stageMap = new Map<string, number>();
    for (const app of applications ?? []) {
      const requisition = pickOne(
        app.job_requisitions as { branch_id?: string | null; department_id?: string | null } | null,
      );
      if (requisition && !matchesFilters(requisition, filters)) continue;
      stageMap.set(app.stage, (stageMap.get(app.stage) ?? 0) + 1);
      if (["applied", "screening", "interview", "assessment", "offer"].includes(app.stage)) {
        activeCandidates += 1;
      }
    }
    const stageOrder = ["applied", "screening", "interview", "assessment", "offer", "hired", "rejected", "withdrawn"];
    for (const key of stageOrder) {
      const count = stageMap.get(key) ?? 0;
      if (count > 0) recruitmentByStage.push({ key, count });
    }
  } catch {
    // Recruitment tables may be unavailable for some orgs/modules.
  }

  return {
    filters,
    kpis: {
      activeHeadcount: activeEmployees.length,
      joiners,
      leavers,
      leaveLiabilityRm: Math.round(leaveLiabilityRm),
      leaveRemainingDays,
      lastPayrunNet: Math.round(lastPayrunNet),
      lastPayrunLabel: lastPayrun?.period_label ?? null,
      openRequisitions,
      activeCandidates,
    },
    headcountByBranch: sortedNamedCounts(branchMap),
    headcountByDepartment: sortedNamedCounts(deptMap),
    joinersLeaversByMonth,
    leaveDaysByMonth,
    leaveLiabilityByDepartment: sortedNamedCounts(liabilityByDept),
    payrollByMonth,
    payrollComposition: payrollComposition.filter((row) => row.value > 0),
    recruitmentByStage,
    recruitmentOpenVsCandidates: [
      { name: "Open roles", value: openRequisitions },
      { name: "Active candidates", value: activeCandidates },
    ],
  };
}

export async function getAnalyticsDetail(input: {
  chartKey: AnalyticsChartKey;
  segmentKey: string;
  filters: AnalyticsFilterInput;
}): Promise<AnalyticsDetail> {
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const range = periodRange(input.filters.period);
  const startDate = isoDate(range.start);
  const endDate = isoDate(range.end);
  const limit = 100;

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, email, status, join_date, updated_at, branch_id, department_id, branches(name), departments(name)")
    .eq("organization_id", organizationId);

  const filtered = (employees ?? []).filter((row) => matchesFilters(row, input.filters));

  const asEmployeeRows = (
    rows: typeof filtered,
    title: string,
  ): AnalyticsDetail => ({
    title,
    total: rows.length,
    columns: ["Name", "Email", "Status", "Branch", "Department"],
    rows: rows.slice(0, limit).map((row) => {
      const branch = pickOne(row.branches as { name?: string } | null);
      const department = pickOne(row.departments as { name?: string } | null);
      return {
        Name: row.full_name,
        Email: row.email,
        Status: row.status,
        Branch: branch?.name ?? "—",
        Department: department?.name ?? "—",
      };
    }),
  });

  switch (input.chartKey) {
    case "headcount_branch": {
      const rows = filtered.filter(
        (row) =>
          row.status === "active" &&
          (row.branch_id ?? "unassigned") === input.segmentKey,
      );
      return asEmployeeRows(rows, `Headcount · branch`);
    }
    case "headcount_dept": {
      const rows = filtered.filter(
        (row) =>
          row.status === "active" &&
          (row.department_id ?? "unassigned") === input.segmentKey,
      );
      return asEmployeeRows(rows, `Headcount · department`);
    }
    case "joiners_leavers": {
      const kind = input.segmentKey.startsWith("leavers:") ? "leavers" : "joiners";
      const month = input.segmentKey.split(":")[1] ?? "";
      const rows = filtered.filter((row) => {
        if (kind === "joiners") {
          return toMonthKey(row.join_date) === month && row.join_date >= startDate && row.join_date <= endDate;
        }
        if (row.status !== "terminated" && row.status !== "inactive") return false;
        const updated = String(row.updated_at ?? "").slice(0, 10);
        return toMonthKey(updated) === month && updated >= startDate && updated <= endDate;
      });
      return asEmployeeRows(rows, `${kind} · ${month}`);
    }
    case "leave_liability": {
      const rows = filtered.filter(
        (row) => row.status === "active" && (row.department_id ?? "unassigned") === input.segmentKey,
      );
      return asEmployeeRows(rows, `Leave liability · department`);
    }
    case "leave_days": {
      const month = input.segmentKey;
      const ids = filtered.map((e) => e.id);
      const { data: requests } = ids.length
        ? await supabase
            .from("leave_requests")
            .select("employee_id, days, start_date, status, employees(full_name, email)")
            .eq("organization_id", organizationId)
            .in("employee_id", ids)
            .in("status", ["pending", "approved"])
        : { data: [] as Array<Record<string, unknown>> };
      const rows = (requests ?? [])
        .filter((row) => toMonthKey(String(row.start_date)) === month)
        .slice(0, limit)
        .map((row) => {
          const employee = pickOne(row.employees as { full_name?: string; email?: string } | null);
          return {
            Employee: employee?.full_name ?? "—",
            Email: employee?.email ?? "—",
            Days: Number(row.days ?? 0),
            Start: String(row.start_date ?? ""),
            Status: String(row.status ?? ""),
          };
        });
      return { title: `Leave days · ${month}`, total: rows.length, columns: ["Employee", "Email", "Days", "Start", "Status"], rows };
    }
    case "recruitment_funnel": {
      const { data: applications } = await supabase
        .from("job_applications")
        .select(
          "id, stage, applied_at, job_candidates(full_name, email), job_requisitions(title, branch_id, department_id)",
        )
        .eq("organization_id", organizationId)
        .eq("stage", input.segmentKey);
      const rows = (applications ?? [])
        .filter((app) => {
          const requisition = pickOne(
            app.job_requisitions as { branch_id?: string | null; department_id?: string | null; title?: string } | null,
          );
          return !requisition || matchesFilters(requisition, input.filters);
        })
        .slice(0, limit)
        .map((app) => {
          const candidate = pickOne(app.job_candidates as { full_name?: string; email?: string } | null);
          const requisition = pickOne(app.job_requisitions as { title?: string } | null);
          return {
            Candidate: candidate?.full_name ?? "—",
            Email: candidate?.email ?? "—",
            Role: requisition?.title ?? "—",
            Stage: app.stage,
          };
        });
      return {
        title: `Recruitment · ${input.segmentKey}`,
        total: rows.length,
        columns: ["Candidate", "Email", "Role", "Stage"],
        rows,
      };
    }
    case "recruitment_open":
    case "payroll_monthly":
    case "payroll_composition":
    default: {
      return {
        title: "Detail",
        total: 0,
        columns: ["Info"],
        rows: [{ Info: "No row-level detail for this segment yet." }],
      };
    }
  }
}

export type { AnalyticsPeriod };
