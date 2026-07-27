import type { EmployeeDetail } from "@/lib/employees/queries";
import {
  getEmployeeCompensation,
  ensureEmployeeTaxProfile,
  getEmployeeTaxProfile,
  listAllowanceComponents,
  listRecurringAllowances,
  type AllowanceComponentOption,
  type EmployeeCompensation,
  type EmployeeTaxProfile,
  type RecurringAllowance,
} from "@/lib/payroll/compensation";
import { ensurePayrollComponents } from "@/lib/payroll/seed";
import { createClient } from "@/lib/supabase/server";

export type EmployeePayrollSectionData = {
  compensation: EmployeeCompensation;
  allowances: RecurringAllowance[];
  allowanceComponents: AllowanceComponentOption[];
  taxProfile: EmployeeTaxProfile;
};

export async function getEmployeePayrollSectionData(
  employee: EmployeeDetail,
): Promise<EmployeePayrollSectionData> {
  const supabase = await createClient();
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (organizationId) {
    await ensurePayrollComponents(supabase, organizationId).catch(() => null);
  }

  await ensureEmployeeTaxProfile(employee.id).catch(() => null);

  const [compensation, allowances, allowanceComponents, taxProfile] = await Promise.all([
    getEmployeeCompensation(employee.id).catch(() => null),
    listRecurringAllowances(employee.id).catch(() => []),
    listAllowanceComponents().catch(() => []),
    getEmployeeTaxProfile(employee.id).catch(() => null),
  ]);

  const childCount = employee.dependents.filter((row) => row.dependentType === "child").length;

  return {
    compensation: compensation ?? {
      payBasis: employee.profile.payBasis ?? "monthly",
      basicSalary: employee.profile.basicSalary,
      hourlyRate: null,
      dailyRate: null,
      voluntaryEpfExtraRate: employee.profile.voluntaryEpfExtraRate,
      socsoCategoryOverride: null,
      epfEmployeeRate: employee.profile.epfEmployeeRate,
      epfEmployerRate: employee.profile.epfEmployerRate,
      eisEligible: employee.profile.eisEligible,
    },
    allowances,
    allowanceComponents,
    taxProfile: taxProfile ?? {
      maritalStatus: employee.profile.maritalStatus,
      spouseWorking:
        employee.dependents.find((row) => row.dependentType === "spouse")?.isWorking ?? null,
      childCount,
      zakatAnnual: 0,
      zakatMonthly: 0,
      otherReliefs: 0,
      ytdGross: 0,
      ytdEpf: 0,
      ytdPcb: 0,
      openingBalance: false,
    },
  };
}
