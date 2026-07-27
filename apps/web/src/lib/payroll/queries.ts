import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

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
  const organizationId = getOrganizationId();
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
    .eq("organization_id", getOrganizationId())
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

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
    .eq("organization_id", getOrganizationId())
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    cycle: row.cycle,
    cutoffDay: row.cutoff_day,
  }));
}

export async function getPayrunDetail(payrunId: string): Promise<PayrunDetail | null> {
  await requireRole("hr_administrator", "director");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

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

  const { data: items, error: itemsError } = await supabase
    .from("payroll_payrun_items")
    .select(
      "id, gross_pay, epf_employee, epf_employer, socso_employee, socso_employer, eis_employee, eis_employer, pcb, hrdf_employer, net_pay, requires_resolution, employees(employee_number, full_name, email), branches(name)",
    )
    .eq("payrun_id", payrunId)
    .eq("organization_id", organizationId)
    .order("created_at");

  if (itemsError) throw new Error(itemsError.message);

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

  const totals = mappedItems.reduce(
    (acc, item) => ({
      gross: acc.gross + Number(item.grossPay),
      epfEmployee: acc.epfEmployee + Number(item.epfEmployee),
      epfEmployer: acc.epfEmployer + Number(item.epfEmployer),
      socsoEmployee: acc.socsoEmployee + Number(item.socsoEmployee),
      socsoEmployer: acc.socsoEmployer + Number(item.socsoEmployer),
      eisEmployee: acc.eisEmployee + Number(item.eisEmployee),
      eisEmployer: acc.eisEmployer + Number(item.eisEmployer),
      pcb: acc.pcb + Number(item.pcb),
      hrdfEmployer: acc.hrdfEmployer + Number(item.hrdfEmployer),
      net: acc.net + Number(item.netPay),
    }),
    {
      gross: 0,
      epfEmployee: 0,
      epfEmployer: 0,
      socsoEmployee: 0,
      socsoEmployer: 0,
      eisEmployee: 0,
      eisEmployer: 0,
      pcb: 0,
      hrdfEmployer: 0,
      net: 0,
    },
  );

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
    flaggedCount: mappedItems.filter((item) => item.requiresResolution).length,
    totals,
    items: mappedItems,
  };
}
