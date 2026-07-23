import {
  epfContributableWage,
  epfEmployee,
  epfEmployer,
  eisEmployee,
  eisEmployer,
  money,
  roundRinggit,
} from "@hrms/domain";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type PayrunRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  earningPeriodStart: string;
  earningPeriodEnd: string;
};

export async function listPayruns(): Promise<PayrunRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll_payruns")
    .select("id, period_year, period_month, status, earning_period_start, earning_period_end")
    .eq("organization_id", getOrganizationId())
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    status: row.status,
    earningPeriodStart: row.earning_period_start,
    earningPeriodEnd: row.earning_period_end,
  }));
}

export async function createDraftPayrun(input: {
  periodYear: number;
  periodMonth: number;
  earningPeriodStart: string;
  earningPeriodEnd: string;
}): Promise<string> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: payrun, error } = await supabase
    .from("payroll_payruns")
    .insert({
      organization_id: organizationId,
      period_year: input.periodYear,
      period_month: input.periodMonth,
      earning_period_start: input.earningPeriodStart,
      earning_period_end: input.earningPeriodEnd,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !payrun) throw new Error(error?.message ?? "Failed to create payrun.");

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, employee_profiles(basic_salary)")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (employeesError) throw new Error(employeesError.message);

  for (const employee of employees ?? []) {
    const profile = Array.isArray(employee.employee_profiles)
      ? employee.employee_profiles[0]
      : employee.employee_profiles;
    const gross = money(String(profile?.basic_salary ?? 0));
    const contributable = epfContributableWage(gross, "none");
    const epfEmp = epfEmployee(contributable, 11);
    const epfEr = epfEmployer(contributable, 13);
    const eisEmp = eisEmployee(gross, true);
    const eisEr = eisEmployer(gross, true);
    const deductions = epfEmp.add(eisEmp);
    const net = roundRinggit(gross.sub(deductions));

    await supabase.from("payroll_payrun_items").insert({
      payrun_id: payrun.id,
      organization_id: organizationId,
      employee_id: employee.id,
      gross_pay: gross.toFixed(2),
      statutory_wage_base: gross.toFixed(2),
      epf_employee: epfEmp.toFixed(2),
      epf_employer: epfEr.toFixed(2),
      eis_employee: eisEmp.toFixed(2),
      eis_employer: eisEr.toFixed(2),
      net_pay: net.toFixed(2),
    });
  }

  return payrun.id;
}

export async function getPayrunDetail(payrunId: string) {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: payrun, error } = await supabase
    .from("payroll_payruns")
    .select("id, period_year, period_month, status, earning_period_start, earning_period_end, locked_at")
    .eq("id", payrunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payrun) return null;

  const { data: items, error: itemsError } = await supabase
    .from("payroll_payrun_items")
    .select(
      "id, gross_pay, epf_employee, eis_employee, net_pay, employees(employee_number, full_name, email)",
    )
    .eq("payrun_id", payrunId)
    .eq("organization_id", organizationId)
    .order("created_at");

  if (itemsError) throw new Error(itemsError.message);

  return {
    id: payrun.id,
    periodYear: payrun.period_year,
    periodMonth: payrun.period_month,
    status: payrun.status,
    earningPeriodStart: payrun.earning_period_start,
    earningPeriodEnd: payrun.earning_period_end,
    lockedAt: payrun.locked_at,
    items: (items ?? []).map((row) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      return {
        id: row.id,
        employeeNumber: (employee as { employee_number?: string } | null)?.employee_number ?? "—",
        employeeName:
          (employee as { full_name?: string; email?: string } | null)?.full_name ??
          (employee as { email?: string } | null)?.email ??
          "Employee",
        grossPay: row.gross_pay,
        epfEmployee: row.epf_employee,
        eisEmployee: row.eis_employee,
        netPay: row.net_pay,
      };
    }),
  };
}

export async function lockPayrun(payrunId: string, actorUserId: string): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: payrun, error: fetchError } = await supabase
    .from("payroll_payruns")
    .select("status")
    .eq("id", payrunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!payrun) throw new Error("Payrun not found.");
  if (payrun.status === "locked") return;

  const { error } = await supabase
    .from("payroll_payruns")
    .update({ status: "locked", locked_at: new Date().toISOString() })
    .eq("id", payrunId);

  if (error) throw new Error(error.message);

  await supabase.from("payroll_payrun_status_log").insert({
    payrun_id: payrunId,
    organization_id: organizationId,
    from_status: payrun.status,
    to_status: "locked",
    actor_user_id: actorUserId,
  });
}
