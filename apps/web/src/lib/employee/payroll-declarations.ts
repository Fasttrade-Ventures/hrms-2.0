import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";

export type EmployeePayrollDeclarationsInput = {
  zakatAnnual: number;
  zakatMonthly: number;
  otherReliefs: number;
  voluntaryEpfExtraRate: number;
};

export type EmployeePayrollDeclarations = EmployeePayrollDeclarationsInput & {
  epfEmployeeRate: number;
};

export async function getEmployeePayrollDeclarations(): Promise<EmployeePayrollDeclarations> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select(
      `employee_profiles(pay_basis, basic_salary, epf_employee_rate),
       employee_compensation(voluntary_epf_extra_rate, pay_basis, basic_salary),
       employee_tax_profiles(zakat_annual, zakat_monthly, tp1_payload)`,
    )
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const compensation = Array.isArray(data?.employee_compensation)
    ? data?.employee_compensation[0]
    : data?.employee_compensation;
  const profile = Array.isArray(data?.employee_profiles)
    ? data?.employee_profiles[0]
    : data?.employee_profiles;
  const tax = Array.isArray(data?.employee_tax_profiles)
    ? data?.employee_tax_profiles[0]
    : data?.employee_tax_profiles;
  const tp1Payload = (tax?.tp1_payload ?? {}) as { otherReliefs?: number };

  return {
    zakatAnnual: Number(tax?.zakat_annual ?? 0),
    zakatMonthly: Number(tax?.zakat_monthly ?? 0),
    otherReliefs: Number(tp1Payload.otherReliefs ?? 0),
    voluntaryEpfExtraRate: Number(compensation?.voluntary_epf_extra_rate ?? 0),
    epfEmployeeRate: Number(profile?.epf_employee_rate ?? 11),
  };
}

export async function upsertEmployeePayrollDeclarations(
  input: EmployeePayrollDeclarationsInput,
): Promise<void> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: employee, error: fetchError } = await supabase
    .from("employees")
    .select(
      `employee_profiles(pay_basis, basic_salary),
       employee_compensation(pay_basis, basic_salary)`,
    )
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const compensation = Array.isArray(employee?.employee_compensation)
    ? employee?.employee_compensation[0]
    : employee?.employee_compensation;
  const profile = Array.isArray(employee?.employee_profiles)
    ? employee?.employee_profiles[0]
    : employee?.employee_profiles;

  const { error: taxError } = await supabase.from("employee_tax_profiles").upsert({
    employee_id: employeeId,
    organization_id: organizationId,
    zakat_annual: input.zakatAnnual,
    zakat_monthly: input.zakatMonthly,
    tp1_payload: { otherReliefs: input.otherReliefs },
    updated_at: new Date().toISOString(),
  });

  if (taxError) throw new Error(taxError.message);

  const payBasis = (compensation?.pay_basis ?? profile?.pay_basis ?? "monthly") as
    | "monthly"
    | "hourly"
    | "daily";
  const basicSalary = Number(compensation?.basic_salary ?? profile?.basic_salary ?? 0);

  const { error: compError } = await supabase.from("employee_compensation").upsert({
    employee_id: employeeId,
    organization_id: organizationId,
    pay_basis: payBasis,
    basic_salary: basicSalary,
    voluntary_epf_extra_rate: input.voluntaryEpfExtraRate,
    updated_at: new Date().toISOString(),
  });

  if (compError) throw new Error(compError.message);
}
