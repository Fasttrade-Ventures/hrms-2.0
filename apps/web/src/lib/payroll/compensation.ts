import { requireRole, requireRoleOrPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export type EmployeeCompensation = {
  payBasis: "monthly" | "hourly" | "daily";
  basicSalary: number;
  hourlyRate: number | null;
  dailyRate: number | null;
  otHourlyRate: number | null;
  voluntaryEpfExtraRate: number;
  socsoCategoryOverride: "cat1" | "cat2" | null;
  epfEmployeeRate: number;
  epfEmployerRate: number;
  eisEligible: boolean;
};

export type RecurringAllowance = {
  id: string;
  componentId: string;
  componentCode: string;
  componentName: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type AllowanceComponentOption = {
  id: string;
  code: string;
  name: string;
};

export type EmployeeTaxProfile = {
  maritalStatus: string | null;
  spouseWorking: boolean | null;
  childCount: number;
  zakatAnnual: number;
  zakatMonthly: number;
  otherReliefs: number;
  ytdGross: number;
  ytdEpf: number;
  ytdPcb: number;
  openingBalance: boolean;
  pcbManualAmount: number | null;
};

export async function listAllowanceComponents(): Promise<AllowanceComponentOption[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll_components")
    .select("id, code, name")
    .eq("organization_id", organizationId)
    .eq("component_type", "earning")
    .eq("is_active", true)
    .like("code", "ALLOW_%")
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name }));
}

export async function getEmployeeCompensation(employeeId: string): Promise<EmployeeCompensation | null> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select(
      `employee_profiles(pay_basis, basic_salary, epf_employee_rate, epf_employer_rate, eis_eligible),
       employee_compensation(pay_basis, basic_salary, hourly_rate, daily_rate, ot_hourly_rate, voluntary_epf_extra_rate, socso_category_override)`,
    )
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) return null;

  const profile = Array.isArray(employee.employee_profiles)
    ? employee.employee_profiles[0]
    : employee.employee_profiles;
  const compensation = Array.isArray(employee.employee_compensation)
    ? employee.employee_compensation[0]
    : employee.employee_compensation;

  const payBasis = (compensation?.pay_basis ?? profile?.pay_basis ?? "monthly") as EmployeeCompensation["payBasis"];

  return {
    payBasis,
    basicSalary: Number(compensation?.basic_salary ?? profile?.basic_salary ?? 0),
    hourlyRate: compensation?.hourly_rate != null ? Number(compensation.hourly_rate) : null,
    dailyRate: compensation?.daily_rate != null ? Number(compensation.daily_rate) : null,
    otHourlyRate: compensation?.ot_hourly_rate != null ? Number(compensation.ot_hourly_rate) : null,
    voluntaryEpfExtraRate: Number(compensation?.voluntary_epf_extra_rate ?? 0),
    socsoCategoryOverride: (compensation?.socso_category_override as "cat1" | "cat2" | null) ?? null,
    epfEmployeeRate: Number(profile?.epf_employee_rate ?? 11),
    epfEmployerRate: Number(profile?.epf_employer_rate ?? 13),
    eisEligible: profile?.eis_eligible ?? true,
  };
}

export async function listRecurringAllowances(employeeId: string): Promise<RecurringAllowance[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_recurring_allowances")
    .select("id, amount, effective_from, effective_to, payroll_components(id, code, name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const component = Array.isArray(row.payroll_components)
      ? row.payroll_components[0]
      : row.payroll_components;
    if (!component) return [];
    return [
      {
        id: row.id,
        componentId: component.id,
        componentCode: component.code,
        componentName: component.name,
        amount: Number(row.amount),
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      },
    ];
  });
}

export async function upsertEmployeeCompensation(
  employeeId: string,
  input: EmployeeCompensation,
): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase.from("employee_compensation").upsert({
    employee_id: employeeId,
    organization_id: organizationId,
    pay_basis: input.payBasis,
    basic_salary: input.basicSalary,
    hourly_rate: input.hourlyRate,
    daily_rate: input.dailyRate,
    ot_hourly_rate: input.otHourlyRate,
    voluntary_epf_extra_rate: input.voluntaryEpfExtraRate,
    socso_category_override: input.socsoCategoryOverride,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  await supabase
    .from("employee_profiles")
    .update({
      pay_basis: input.payBasis,
      basic_salary: input.basicSalary,
      epf_employee_rate: input.epfEmployeeRate,
      epf_employer_rate: input.epfEmployerRate,
      eis_eligible: input.eisEligible,
    })
    .eq("employee_id", employeeId);
}

export async function upsertRecurringAllowance(
  employeeId: string,
  input: {
    id?: string;
    componentId: string;
    amount: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
  },
): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const row = {
    organization_id: organizationId,
    employee_id: employeeId,
    component_id: input.componentId,
    amount: input.amount,
    effective_from: input.effectiveFrom,
    effective_to: input.effectiveTo ?? null,
  };

  if (input.id) {
    const { error } = await supabase.from("employee_recurring_allowances").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("employee_recurring_allowances").insert(row);
  if (error) throw new Error(error.message);
}

export async function deleteRecurringAllowance(allowanceId: string): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_recurring_allowances")
    .delete()
    .eq("id", allowanceId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}

async function ensureEmployeeTaxProfileRow(employeeId: string, organizationId: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("employee_tax_profiles")
    .select("employee_id")
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing) return;

  const { data: employee } = await supabase
    .from("employees")
    .select("employee_profiles(marital_status), employee_dependents(dependent_type, is_working)")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!employee) return;

  const profile = Array.isArray(employee.employee_profiles)
    ? employee.employee_profiles[0]
    : employee.employee_profiles;
  const dependents = employee.employee_dependents ?? [];
  const spouse = dependents.find((row) => row.dependent_type === "spouse");

  const { error } = await supabase.from("employee_tax_profiles").insert({
    employee_id: employeeId,
    organization_id: organizationId,
    marital_status: profile?.marital_status ?? null,
    spouse_working: spouse?.is_working ?? null,
    zakat_annual: 0,
    zakat_monthly: 0,
    tp1_payload: { otherReliefs: 0 },
  });

  if (error) throw new Error(error.message);
}

export async function ensureEmployeeTaxProfile(employeeId: string): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  await ensureEmployeeTaxProfileRow(employeeId, organizationId);
}

export async function getEmployeeTaxProfile(employeeId: string): Promise<EmployeeTaxProfile | null> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const { data: employee } = await supabase
    .from("employees")
    .select(
      `employee_profiles(marital_status),
       employee_tax_profiles(marital_status, spouse_working, zakat_annual, zakat_monthly, tp1_payload, pcb_manual_amount),
       employee_dependents(dependent_type)`,
    )
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) return null;

  const profile = Array.isArray(employee.employee_profiles)
    ? employee.employee_profiles[0]
    : employee.employee_profiles;
  const tax = Array.isArray(employee.employee_tax_profiles)
    ? employee.employee_tax_profiles[0]
    : employee.employee_tax_profiles;
  const dependents = employee.employee_dependents ?? [];
  const childCount = dependents.filter((row) => row.dependent_type === "child").length;
  const tp1Payload = (tax?.tp1_payload ?? {}) as { otherReliefs?: number };

  const { data: ytd } = await supabase
    .from("payroll_ytd_balances")
    .select("ytd_gross, ytd_epf_employee, ytd_pcb, opening_balance")
    .eq("employee_id", employeeId)
    .eq("calendar_year", year)
    .maybeSingle();

  return {
    maritalStatus: tax?.marital_status ?? profile?.marital_status ?? null,
    spouseWorking: tax?.spouse_working ?? null,
    childCount,
    zakatAnnual: Number(tax?.zakat_annual ?? 0),
    zakatMonthly: Number(tax?.zakat_monthly ?? 0),
    otherReliefs: Number(tp1Payload.otherReliefs ?? 0),
    ytdGross: Number(ytd?.ytd_gross ?? 0),
    ytdEpf: Number(ytd?.ytd_epf_employee ?? 0),
    ytdPcb: Number(ytd?.ytd_pcb ?? 0),
    openingBalance: Boolean(ytd?.opening_balance),
    pcbManualAmount:
      tax?.pcb_manual_amount === null || tax?.pcb_manual_amount === undefined
        ? null
        : Number(tax.pcb_manual_amount),
  };
}

export async function upsertEmployeeTaxProfile(
  employeeId: string,
  input: {
    maritalStatus?: string | null;
    spouseWorking?: boolean | null;
    zakatAnnual: number;
    zakatMonthly?: number;
    otherReliefs?: number;
    pcbManualAmount?: number | null;
  },
): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const row: {
    employee_id: string;
    organization_id: string;
    marital_status: string | null;
    spouse_working: boolean | null;
    zakat_annual: number;
    zakat_monthly: number;
    tp1_payload: { otherReliefs: number };
    updated_at: string;
    pcb_manual_amount?: number | null;
  } = {
    employee_id: employeeId,
    organization_id: organizationId,
    marital_status: input.maritalStatus ?? null,
    spouse_working: input.spouseWorking ?? null,
    zakat_annual: input.zakatAnnual,
    zakat_monthly: input.zakatMonthly ?? 0,
    tp1_payload: { otherReliefs: input.otherReliefs ?? 0 },
    updated_at: new Date().toISOString(),
  };

  if (input.pcbManualAmount !== undefined) {
    row.pcb_manual_amount = input.pcbManualAmount;
  }

  const { error } = await supabase.from("employee_tax_profiles").upsert(row);

  if (error) throw new Error(error.message);
}

export async function setEmployeePcbManualAmount(
  employeeId: string,
  amount: number | null,
  userId: string,
): Promise<void> {
  await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  const organizationId = await requireOrganizationId();
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    throw new Error("PCB amount must be zero or greater.");
  }
  const supabase = await createClient();
  await ensureEmployeeTaxProfileRow(employeeId, organizationId);
  const { error } = await supabase
    .from("employee_tax_profiles")
    .update({
      pcb_manual_amount: amount,
      pcb_manual_updated_at: new Date().toISOString(),
      pcb_manual_updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}

export async function setYtdOpeningBalance(
  employeeId: string,
  year: number,
  balances: { gross: number; epf: number; pcb: number },
): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase.from("payroll_ytd_balances").upsert(
    {
      organization_id: organizationId,
      employee_id: employeeId,
      calendar_year: year,
      ytd_gross: balances.gross,
      ytd_epf_employee: balances.epf,
      ytd_pcb: balances.pcb,
      opening_balance: true,
    },
    { onConflict: "employee_id,calendar_year" },
  );

  if (error) throw new Error(error.message);
}
