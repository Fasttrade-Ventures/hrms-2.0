import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export type PayrunListItem = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  earningPeriodStart: string;
  earningPeriodEnd: string;
  payDate: string | null;
  scope: string;
  payrunType: string;
  payGroupName: string | null;
};

export type PayrunLineItem = {
  id: string;
  employeeNumber: string;
  employeeName: string;
  branchName: string | null;
  grossPay: string;
  basicPay: string | null;
  epfEmployee: string;
  epfEmployer: string;
  socsoEmployee: string;
  socsoEmployer: string;
  eisEmployee: string;
  eisEmployer: string;
  pcb: string;
  hrdfEmployer: string;
  netPay: string;
  requiresResolution: boolean;
};

export type PayrunDetail = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  earningPeriodStart: string;
  earningPeriodEnd: string;
  payDate: string | null;
  scope: string;
  payrunType: string;
  payGroupName: string | null;
  lockedAt: string | null;
  flaggedCount: number;
  itemTotal: number;
  page: number;
  pageSize: number;
  totals: {
    gross: number;
    epfEmployee: number;
    epfEmployer: number;
    socsoEmployee: number;
    socsoEmployer: number;
    eisEmployee: number;
    eisEmployer: number;
    pcb: number;
    hrdfEmployer: number;
    net: number;
  };
  items: PayrunLineItem[];
};

export type PayGroupOption = {
  id: string;
  name: string;
  cycle: string;
  cutoffDay: number;
};

export async function listPayrunBranches(payrunId: string): Promise<Array<{ id: string; name: string }>> {
  await requireRole("hr_administrator", "director");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("payroll_payrun_items")
    .select("branch_id, branches(id, name)")
    .eq("payrun_id", payrunId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of items ?? []) {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    if (branch?.id && branch?.name) map.set(branch.id, branch.name);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export async function listPayruns(): Promise<PayrunListItem[]> {
  await requireRole("hr_administrator", "director");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll_payruns")
    .select(
      "id, period_year, period_month, status, earning_period_start, earning_period_end, pay_date, scope, payrun_type, pay_groups(name)",
    )
    .eq("organization_id", await requireOrganizationId())
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const payGroup = Array.isArray(row.pay_groups) ? row.pay_groups[0] : row.pay_groups;
    return {
      id: row.id,
      periodYear: row.period_year,
      periodMonth: row.period_month,
      status: row.status,
      earningPeriodStart: row.earning_period_start,
      earningPeriodEnd: row.earning_period_end,
      payDate: row.pay_date,
      scope: row.scope,
      payrunType: row.payrun_type,
      payGroupName: (payGroup as { name?: string } | null)?.name ?? null,
    };
  });
}

export async function listPayGroups(): Promise<PayGroupOption[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pay_groups")
    .select("id, name, cycle, cutoff_day")
    .eq("organization_id", await requireOrganizationId())
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    cycle: row.cycle,
    cutoffDay: row.cutoff_day,
  }));
}

export async function getPayrunDetail(
  payrunId: string,
  opts?: { page?: number; pageSize?: number },
): Promise<PayrunDetail | null> {
  await requireRole("hr_administrator", "director");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 50, 10), 200);
  const page = Math.max(opts?.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: payrun, error } = await supabase
    .from("payroll_payruns")
    .select(
      "id, period_year, period_month, status, earning_period_start, earning_period_end, pay_date, scope, payrun_type, locked_at, pay_groups(name)",
    )
    .eq("id", payrunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payrun) return null;

  const [
    { data: items, error: itemsError, count: itemCount },
    { data: totalsRow, error: totalsError },
  ] = await Promise.all([
    supabase
      .from("payroll_payrun_items")
      .select(
        "id, gross_pay, epf_employee, epf_employer, socso_employee, socso_employer, eis_employee, eis_employer, pcb, hrdf_employer, net_pay, requires_resolution, employees(employee_number, full_name, email), branches(name)",
        { count: "exact" },
      )
      .eq("payrun_id", payrunId)
      .eq("organization_id", organizationId)
      .order("created_at")
      .range(from, to),
    supabase.rpc("payrun_item_totals", {
      p_organization_id: organizationId,
      p_payrun_id: payrunId,
    }),
  ]);

  if (itemsError) throw new Error(itemsError.message);
  if (totalsError) throw new Error(totalsError.message);

  const totalsSource = Array.isArray(totalsRow) ? totalsRow[0] : totalsRow;
  const flaggedCount = Number(totalsSource?.flagged_count ?? 0);

  const itemIds = (items ?? []).map((row) => row.id);
  const basicByItem = new Map<string, string>();

  if (itemIds.length > 0) {
    const { data: basicComponents } = await supabase
      .from("payroll_item_components")
      .select("payrun_item_id, amount, payroll_components(code)")
      .in("payrun_item_id", itemIds)
      .eq("organization_id", organizationId);

    for (const row of basicComponents ?? []) {
      const component = Array.isArray(row.payroll_components)
        ? row.payroll_components[0]
        : row.payroll_components;
      if ((component as { code?: string } | null)?.code === "BASIC") {
        basicByItem.set(row.payrun_item_id, row.amount);
      }
    }
  }

  const mappedItems: PayrunLineItem[] = (items ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    return {
      id: row.id,
      employeeNumber: (employee as { employee_number?: string } | null)?.employee_number ?? "—",
      employeeName:
        (employee as { full_name?: string; email?: string } | null)?.full_name ??
        (employee as { email?: string } | null)?.email ??
        "Employee",
      branchName: (branch as { name?: string } | null)?.name ?? null,
      grossPay: row.gross_pay,
      basicPay: basicByItem.get(row.id) ?? null,
      epfEmployee: row.epf_employee,
      epfEmployer: row.epf_employer,
      socsoEmployee: row.socso_employee,
      socsoEmployer: row.socso_employer,
      eisEmployee: row.eis_employee,
      eisEmployer: row.eis_employer,
      pcb: row.pcb,
      hrdfEmployer: row.hrdf_employer,
      netPay: row.net_pay,
      requiresResolution: row.requires_resolution,
    };
  });

  const totals = {
    gross: Number(totalsSource?.gross_pay ?? 0),
    epfEmployee: Number(totalsSource?.epf_employee ?? 0),
    epfEmployer: Number(totalsSource?.epf_employer ?? 0),
    socsoEmployee: Number(totalsSource?.socso_employee ?? 0),
    socsoEmployer: Number(totalsSource?.socso_employer ?? 0),
    eisEmployee: Number(totalsSource?.eis_employee ?? 0),
    eisEmployer: Number(totalsSource?.eis_employer ?? 0),
    pcb: Number(totalsSource?.pcb ?? 0),
    hrdfEmployer: Number(totalsSource?.hrdf_employer ?? 0),
    net: Number(totalsSource?.net_pay ?? 0),
  };

  const payGroup = Array.isArray(payrun.pay_groups) ? payrun.pay_groups[0] : payrun.pay_groups;

  return {
    id: payrun.id,
    periodYear: payrun.period_year,
    periodMonth: payrun.period_month,
    status: payrun.status,
    earningPeriodStart: payrun.earning_period_start,
    earningPeriodEnd: payrun.earning_period_end,
    payDate: payrun.pay_date,
    scope: payrun.scope,
    payrunType: payrun.payrun_type,
    payGroupName: (payGroup as { name?: string } | null)?.name ?? null,
    lockedAt: payrun.locked_at,
    flaggedCount: flaggedCount ?? 0,
    itemTotal: itemCount ?? mappedItems.length,
    page,
    pageSize,
    totals,
    items: mappedItems,
  };
}
