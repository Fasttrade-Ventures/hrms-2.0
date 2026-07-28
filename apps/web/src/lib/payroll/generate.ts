import { computeEmployeePayrun, money, type PayFrequency } from "@hrms/domain";
import type { CreatePayrunInput } from "@hrms/validation";

import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import {
  buildEmployeePayrunComputeInput,
  payrunItemPatchFromResult,
} from "@/lib/payroll/build-compute-input";
import { buildEmployeePayLines } from "@/lib/payroll/feeds";
import { buildPayrunItemComponentRows } from "@/lib/payroll/item-components";
import { assertStatutoryRulesAvailable, loadStatutoryRulePacks } from "@/lib/payroll/rules";
import { ensurePayrollComponents } from "@/lib/payroll/seed";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function mapPayFrequency(cycle: string | null | undefined): PayFrequency {
  if (cycle === "weekly") return "weekly";
  if (cycle === "biweekly") return "biweekly";
  return "monthly";
}

export async function generateDraftPayrun(input: CreatePayrunInput): Promise<string> {
  await requireModule("payroll");
  await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  await assertStatutoryRulesAvailable(input.earningPeriodEnd);
  const statutoryRules = await loadStatutoryRulePacks(input.earningPeriodEnd);

  const organizationId = getOrganizationId();
  const supabase = await createClient();

  if (input.scope === "pay_group" && !input.payGroupId) {
    throw new Error("Pay group is required when scope is pay group.");
  }

  let payGroupCycle: string | null = null;
  if (input.payGroupId) {
    const { data: payGroup } = await supabase
      .from("pay_groups")
      .select("cycle")
      .eq("id", input.payGroupId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    payGroupCycle = payGroup?.cycle ?? null;
  }

  const frequency = mapPayFrequency(payGroupCycle);
  const periodMonth = input.periodMonth ?? new Date(input.earningPeriodEnd).getMonth() + 1;

  const { data: payrun, error } = await supabase
    .from("payroll_payruns")
    .insert({
      organization_id: organizationId,
      pay_group_id: input.scope === "pay_group" ? input.payGroupId : null,
      period_year: input.periodYear,
      period_month: periodMonth,
      period_week: input.periodWeek ?? null,
      earning_period_start: input.earningPeriodStart,
      earning_period_end: input.earningPeriodEnd,
      pay_date: input.payDate,
      status: "draft",
      scope: input.scope,
      payrun_type: input.payrunType,
    })
    .select("id")
    .single();

  if (error || !payrun) throw new Error(error?.message ?? "Failed to create payrun.");

  const { logAuditEvent } = await import("@/lib/audit/log-event");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAuditEvent({
    organizationId,
    actorUserId: user?.id ?? null,
    action: "payroll.payrun_created",
    resourceType: "payroll_payrun",
    resourceId: payrun.id,
    metadata: {
      periodYear: input.periodYear,
      periodMonth,
      scope: input.scope,
    },
  });

  const componentIdByCode = await ensurePayrollComponents(supabase, organizationId);

  let employeeQuery = supabase
    .from("employees")
    .select(
      `id, branch_id, join_date, pay_group_id,
       employee_profiles(basic_salary, epf_employee_rate, epf_employer_rate, eis_eligible, date_of_birth, marital_status, is_foreign_worker),
       employee_compensation(pay_basis, basic_salary, hourly_rate, daily_rate, voluntary_epf_extra_rate, socso_category_override),
       employee_tax_profiles(marital_status, spouse_working, zakat_annual, zakat_monthly, tp1_payload),
       employee_dependents(dependent_type)`,
    )
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (input.scope === "pay_group" && input.payGroupId) {
    employeeQuery = employeeQuery.eq("pay_group_id", input.payGroupId);
  }

  const { data: employees, error: employeesError } = await employeeQuery;
  if (employeesError) throw new Error(employeesError.message);

  const { data: branches } = await supabase
    .from("branches")
    .select("id, hrdf_enabled, hrdf_rate, lindung_enabled, lindung_employer_rate, epf_wage_rounding")
    .eq("organization_id", organizationId);
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch]));

  const payInputs =
    employees?.map((employee) => {
      const profile = Array.isArray(employee.employee_profiles)
        ? employee.employee_profiles[0]
        : employee.employee_profiles;
      const compensation = Array.isArray(employee.employee_compensation)
        ? employee.employee_compensation[0]
        : employee.employee_compensation;
      return {
        employeeId: employee.id,
        joinDate: employee.join_date,
        monthlyBasic: Number(compensation?.basic_salary ?? profile?.basic_salary ?? 0),
        payBasis: compensation?.pay_basis ?? "monthly",
        hourlyRate: compensation?.hourly_rate != null ? Number(compensation.hourly_rate) : null,
        dailyRate: compensation?.daily_rate != null ? Number(compensation.daily_rate) : null,
      };
    }) ?? [];

  const linesByEmployee = await buildEmployeePayLines(
    organizationId,
    input.earningPeriodStart,
    input.earningPeriodEnd,
    payInputs,
  );

  const { data: ytdRows } = await supabase
    .from("payroll_ytd_balances")
    .select("employee_id, ytd_gross, ytd_epf_employee, ytd_socso_employee, ytd_eis_employee, ytd_pcb")
    .eq("organization_id", organizationId)
    .eq("calendar_year", input.periodYear);

  const ytdMap = new Map((ytdRows ?? []).map((row) => [row.employee_id, row]));

  for (const employee of employees ?? []) {
    const profile = Array.isArray(employee.employee_profiles)
      ? employee.employee_profiles[0]
      : employee.employee_profiles;
    const compensation = Array.isArray(employee.employee_compensation)
      ? employee.employee_compensation[0]
      : employee.employee_compensation;
    const taxProfile = Array.isArray(employee.employee_tax_profiles)
      ? employee.employee_tax_profiles[0]
      : employee.employee_tax_profiles;
    const dependents = employee.employee_dependents ?? [];
    const branch = employee.branch_id ? branchMap.get(employee.branch_id) : null;
    const ytd = ytdMap.get(employee.id);

    const lines = linesByEmployee.get(employee.id) ?? [
      {
        code: "BASIC",
        amount: money(String(compensation?.basic_salary ?? profile?.basic_salary ?? 0)),
        flags: { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true },
      },
    ];

    const computeInput = buildEmployeePayrunComputeInput({
      lines,
      profile,
      compensation,
      taxProfile,
      dependents,
      branch,
      frequency,
      asOf: input.earningPeriodEnd,
      ytd,
    });
    const result = computeEmployeePayrun({ ...computeInput, statutoryRules });

    const { data: payrunItem, error: itemError } = await supabase
      .from("payroll_payrun_items")
      .insert({
        payrun_id: payrun.id,
        organization_id: organizationId,
        employee_id: employee.id,
        branch_id: employee.branch_id,
        ...payrunItemPatchFromResult(result),
      })
      .select("id")
      .single();

    if (itemError || !payrunItem) throw new Error(itemError?.message ?? "Failed to create payrun item.");

    const componentRows = buildPayrunItemComponentRows(
      payrunItem.id,
      organizationId,
      componentIdByCode,
      lines,
      result,
    );

    if (componentRows.length > 0) {
      const { error: componentsError } = await supabase.from("payroll_item_components").insert(componentRows);
      if (componentsError) throw new Error(componentsError.message);
    }
  }

  return payrun.id;
}
