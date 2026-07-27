import { computeEmployeePayrun, money, type PayrunLine } from "@hrms/domain";

import { requireRoleOrPermission } from "@/lib/auth/session";
import {
  buildEmployeePayrunComputeInput,
  payrunItemPatchFromResult,
} from "@/lib/payroll/build-compute-input";
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

const COMPARE_FIELDS = [
  { key: "gross_pay", label: "Gross pay" },
  { key: "epf_employee", label: "EPF (employee)" },
  { key: "epf_employer", label: "EPF (employer)" },
  { key: "socso_employee", label: "SOCSO (employee)" },
  { key: "socso_employer", label: "SOCSO (employer)" },
  { key: "eis_employee", label: "EIS (employee)" },
  { key: "eis_employer", label: "EIS (employer)" },
  { key: "pcb", label: "PCB" },
  { key: "hrdf_employer", label: "HRDF" },
  { key: "net_pay", label: "Net pay" },
] as const;

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type PayrunSpotCheckField = {
  field: string;
  stored: string;
  computed: string;
  match: boolean;
};

export type PayrunSpotCheckResult = {
  employeeName: string;
  employeeNumber: string;
  fields: PayrunSpotCheckField[];
  allMatch: boolean;
};

export async function spotCheckFirstPayrunLine(payrunId: string): Promise<PayrunSpotCheckResult | null> {
  await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("payroll_payrun_items")
    .select(
      `id, gross_pay, epf_employee, epf_employer, socso_employee, socso_employer, eis_employee, eis_employer, pcb, hrdf_employer, net_pay, employee_id, branch_id,
       payroll_payruns(period_year, earning_period_end, pay_groups(cycle)),
       employees(employee_number, full_name,
         employee_profiles(basic_salary, epf_employee_rate, epf_employer_rate, eis_eligible, date_of_birth, marital_status, is_foreign_worker),
         employee_compensation(voluntary_epf_extra_rate, socso_category_override),
         employee_tax_profiles(marital_status, spouse_working, zakat_annual, zakat_monthly, tp1_payload),
         employee_dependents(dependent_type)
       )`,
    )
    .eq("payrun_id", payrunId)
    .eq("organization_id", organizationId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (itemError) throw new Error(itemError.message);
  if (!item) return null;

  const { data: components, error: componentsError } = await supabase
    .from("payroll_item_components")
    .select("amount, payroll_components(code, is_epf, is_socso, is_eis, is_pcb, is_hrdf)")
    .eq("payrun_item_id", item.id);

  if (componentsError) throw new Error(componentsError.message);

  const lines: PayrunLine[] = [];
  for (const row of components ?? []) {
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

  const payrun = Array.isArray(item.payroll_payruns) ? item.payroll_payruns[0] : item.payroll_payruns;
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
    .eq("calendar_year", payrun?.period_year ?? new Date().getFullYear())
    .maybeSingle();

  const { data: branch } = item.branch_id
    ? await supabase
        .from("branches")
        .select("hrdf_enabled, hrdf_rate, lindung_enabled, lindung_employer_rate, epf_wage_rounding")
        .eq("id", item.branch_id)
        .maybeSingle()
    : { data: null };

  const payGroup = Array.isArray(payrun?.pay_groups) ? payrun.pay_groups[0] : payrun?.pay_groups;
  const frequency =
    payGroup?.cycle === "weekly" ? "weekly" : payGroup?.cycle === "biweekly" ? "biweekly" : "monthly";

  const computeInput = buildEmployeePayrunComputeInput({
    lines,
    profile: profile ?? null,
    compensation: compensation ?? null,
    taxProfile: taxProfile ?? null,
    dependents,
    branch: branch ?? null,
    frequency,
    asOf: payrun?.earning_period_end ?? new Date().toISOString().slice(0, 10),
    ytd: ytd ?? null,
  });
  const result = computeEmployeePayrun(computeInput);
  const computed = payrunItemPatchFromResult(result);

  const fields = COMPARE_FIELDS.map(({ key, label }) => {
    const stored = Number((item as Record<string, unknown>)[key] ?? 0).toFixed(2);
    const calculated = String(computed[key] ?? "0.00");
    return {
      field: label,
      stored,
      computed: calculated,
      match: stored === calculated,
    };
  });

  return {
    employeeName: employee?.full_name ?? "Employee",
    employeeNumber: employee?.employee_number ?? "—",
    fields,
    allMatch: fields.every((field) => field.match),
  };
}
