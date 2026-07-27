import { computeEmployeePayrun, money, type PayrunLine } from "@hrms/domain";

import { requireRoleOrPermission } from "@/lib/auth/session";
import {
  buildEmployeePayrunComputeInput,
  payrunItemPatchFromResult,
} from "@/lib/payroll/build-compute-input";
import { buildPayrunItemComponentRows } from "@/lib/payroll/item-components";
import { ensurePayrollComponents } from "@/lib/payroll/seed";
import { createClient } from "@/lib/supabase/server";

const STATUTORY_CODES = new Set([
  "DED_EPF",
  "DED_SOCSO",
  "DED_EIS",
  "DED_PCB",
  "DED_LINDUNG",
  "DED_ZAKAT",
  "ER_EPF",
  "ER_SOCSO",
  "ER_EIS",
  "ER_HRDF",
  "ER_LINDUNG",
]);

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function editPayrunLine(
  payrunItemId: string,
  componentCode: string,
  amount: number,
): Promise<void> {
  const session = await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("payroll_payrun_items")
    .select(
      `id, payrun_id, employee_id, branch_id,
       payroll_payruns(status, period_year, earning_period_end, pay_groups(cycle)),
       employees(
         join_date,
         employee_profiles(basic_salary, epf_employee_rate, epf_employer_rate, eis_eligible, date_of_birth, marital_status, is_foreign_worker),
         employee_compensation(voluntary_epf_extra_rate, socso_category_override),
         employee_tax_profiles(marital_status, spouse_working, zakat_annual, zakat_monthly, tp1_payload),
         employee_dependents(dependent_type)
       )`,
    )
    .eq("id", payrunItemId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (itemError) throw new Error(itemError.message);
  if (!item) throw new Error("Payrun line not found.");

  const payrun = Array.isArray(item.payroll_payruns) ? item.payroll_payruns[0] : item.payroll_payruns;
  if (!payrun || payrun.status !== "draft") {
    throw new Error("Only draft payrun lines can be edited.");
  }

  const componentIdByCode = await ensurePayrollComponents(supabase, organizationId);
  const componentId = componentIdByCode.get(componentCode);
  if (!componentId) throw new Error("Unknown payroll component.");

  const { data: components, error: componentsError } = await supabase
    .from("payroll_item_components")
    .select("id, amount, payroll_components(code, is_epf, is_socso, is_eis, is_pcb, is_hrdf)")
    .eq("payrun_item_id", payrunItemId);

  if (componentsError) throw new Error(componentsError.message);

  const existing = (components ?? []).find((row) => {
    const code = (
      Array.isArray(row.payroll_components) ? row.payroll_components[0] : row.payroll_components
    ) as { code?: string } | null;
    return code?.code === componentCode;
  });

  if (existing) {
    await supabase.from("payroll_item_components").update({ amount: amount.toFixed(2) }).eq("id", existing.id);
  } else {
    await supabase.from("payroll_item_components").insert({
      payrun_item_id: payrunItemId,
      organization_id: organizationId,
      component_id: componentId,
      amount: amount.toFixed(2),
    });
  }

  const { data: refreshedComponents } = await supabase
    .from("payroll_item_components")
    .select("amount, payroll_components(code, is_epf, is_socso, is_eis, is_pcb, is_hrdf)")
    .eq("payrun_item_id", payrunItemId);

  const lines: PayrunLine[] = [];
  for (const row of refreshedComponents ?? []) {
    const component = (
      Array.isArray(row.payroll_components) ? row.payroll_components[0] : row.payroll_components
    ) as {
      code?: string;
      is_epf?: boolean;
      is_socso?: boolean;
      is_eis?: boolean;
      is_pcb?: boolean;
      is_hrdf?: boolean;
    } | null;
    if (!component?.code || STATUTORY_CODES.has(component.code)) continue;
    lines.push({
      code: component.code,
      amount: money(row.amount),
      flags: {
        isEpf: Boolean(component.is_epf),
        isSocso: Boolean(component.is_socso),
        isEis: Boolean(component.is_eis),
        isPcb: Boolean(component.is_pcb),
        isHrdf: Boolean(component.is_hrdf),
      },
    });
  }

  const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
  const profile = Array.isArray(employee?.employee_profiles)
    ? employee?.employee_profiles[0]
    : employee?.employee_profiles;
  const compensation = Array.isArray(employee?.employee_compensation)
    ? employee?.employee_compensation[0]
    : employee?.employee_compensation;
  const taxProfile = Array.isArray(employee?.employee_tax_profiles)
    ? employee?.employee_tax_profiles[0]
    : employee?.employee_tax_profiles;
  const dependents = employee?.employee_dependents ?? [];

  const { data: ytd } = await supabase
    .from("payroll_ytd_balances")
    .select("ytd_gross, ytd_epf_employee, ytd_socso_employee, ytd_eis_employee, ytd_pcb")
    .eq("employee_id", item.employee_id)
    .eq("calendar_year", payrun.period_year)
    .maybeSingle();

  const { data: branch } = item.branch_id
    ? await supabase
        .from("branches")
        .select("hrdf_enabled, hrdf_rate, lindung_enabled, lindung_employer_rate, epf_wage_rounding")
        .eq("id", item.branch_id)
        .maybeSingle()
    : { data: null };

  const payGroup = Array.isArray(payrun.pay_groups) ? payrun.pay_groups[0] : payrun.pay_groups;
  const frequency =
    payGroup?.cycle === "weekly" ? "weekly" : payGroup?.cycle === "biweekly" ? "biweekly" : "monthly";

  const computeInput = buildEmployeePayrunComputeInput({
    lines,
    profile,
    compensation,
    taxProfile,
    dependents,
    branch,
    frequency,
    asOf: payrun.earning_period_end,
    ytd,
  });
  const result = computeEmployeePayrun(computeInput);

  await supabase
    .from("payroll_payrun_items")
    .update(payrunItemPatchFromResult(result))
    .eq("id", payrunItemId);

  await supabase.from("payroll_item_components").delete().eq("payrun_item_id", payrunItemId).in(
    "component_id",
    [...STATUTORY_CODES]
      .map((code) => componentIdByCode.get(code))
      .filter((id): id is string => Boolean(id)),
  );

  const statutoryRows = buildPayrunItemComponentRows(
    payrunItemId,
    organizationId,
    componentIdByCode,
    lines,
    result,
  ).filter((row) => {
    const code = [...componentIdByCode.entries()].find(([, id]) => id === row.component_id)?.[0];
    return code ? STATUTORY_CODES.has(code) : false;
  });

  if (statutoryRows.length > 0) {
    await supabase.from("payroll_item_components").insert(statutoryRows);
  }

  await supabase
    .from("payroll_payruns")
    .update({ last_edited_by: session.user.id })
    .eq("id", item.payrun_id);
}
