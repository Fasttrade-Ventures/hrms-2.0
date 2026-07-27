import {
  computeEmployeePayrun,
  money,
  type EmployeePayrunInput,
  type EmployeePayrunResult,
  type PayFrequency,
} from "@hrms/domain";

import { buildTp1InputFromEmployeeData } from "@/lib/payroll/tp1-profile";

type BranchSettings = {
  hrdf_enabled?: boolean | null;
  hrdf_rate?: number | null;
  lindung_enabled?: boolean | null;
  lindung_employer_rate?: number | null;
  epf_wage_rounding?: string | null;
} | null;

type ProfileRow = {
  basic_salary?: number | null;
  epf_employee_rate?: number | null;
  epf_employer_rate?: number | null;
  eis_eligible?: boolean | null;
  date_of_birth?: string | null;
  marital_status?: string | null;
  is_foreign_worker?: boolean | null;
} | null;

type CompensationRow = {
  voluntary_epf_extra_rate?: number | null;
  socso_category_override?: string | null;
} | null;

type TaxProfileRow = Record<string, unknown> | null;

type DependentRow = { dependent_type: string; is_working?: boolean | null };

type YtdRow = {
  ytd_gross?: number | null;
  ytd_epf_employee?: number | null;
  ytd_socso_employee?: number | null;
  ytd_eis_employee?: number | null;
  ytd_pcb?: number | null;
} | null;

export function buildEmployeePayrunComputeInput(input: {
  lines: EmployeePayrunInput["lines"];
  profile?: ProfileRow;
  compensation?: CompensationRow;
  taxProfile?: TaxProfileRow;
  dependents: DependentRow[] | DependentRow | null | undefined;
  branch?: BranchSettings;
  frequency: PayFrequency;
  asOf: string;
  ytd?: YtdRow;
}): EmployeePayrunInput {
  const dependents = Array.isArray(input.dependents)
    ? input.dependents
    : input.dependents
      ? [input.dependents]
      : [];

  const tp1 = buildTp1InputFromEmployeeData({
    taxProfile: input.taxProfile,
    profile: input.profile,
    dependents,
  });

  return {
    lines: input.lines,
    dateOfBirth: input.profile?.date_of_birth ?? "1990-01-01",
    asOf: input.asOf,
    eisEligible: input.profile?.eis_eligible ?? true,
    epfEmployeeRate: Number(input.profile?.epf_employee_rate ?? 11),
    epfEmployerRate: Number(input.profile?.epf_employer_rate ?? 13),
    voluntaryEpfExtraRate: Number(input.compensation?.voluntary_epf_extra_rate ?? 0),
    socsoCategoryOverride: (input.compensation?.socso_category_override as "cat1" | "cat2" | null) ?? undefined,
    frequency: input.frequency,
    ytd: {
      gross: money(String(input.ytd?.ytd_gross ?? 0)),
      epf: money(String(input.ytd?.ytd_epf_employee ?? 0)),
      pcb: money(String(input.ytd?.ytd_pcb ?? 0)),
      socso: money(String(input.ytd?.ytd_socso_employee ?? 0)),
      eis: money(String(input.ytd?.ytd_eis_employee ?? 0)),
    },
    tp1: {
      zakatAnnual: money(tp1.tp1.zakatAnnual),
      spouse: tp1.tp1.spouse,
      children: tp1.tp1.children,
      other: money(tp1.tp1.otherReliefs),
    },
    zakatMonthly: money(tp1.tp1.zakatMonthly),
    hrdfEnabled: Boolean(input.branch?.hrdf_enabled),
    hrdfRate: Number(input.branch?.hrdf_rate ?? 0.01),
    lindungEnabled: Boolean(input.branch?.lindung_enabled),
    lindungRate: 0.0075,
    lindungEmployerRate: Number(input.branch?.lindung_employer_rate ?? 0),
    epfWageRounding: input.branch?.epf_wage_rounding === "ceil_rm50" ? "ceil_rm50" : "none",
    isForeignWorker: Boolean(input.profile?.is_foreign_worker),
    maritalCategory: tp1.maritalCategory,
  };
}

export function computeEmployeePayrunFromRows(
  input: Parameters<typeof buildEmployeePayrunComputeInput>[0],
): EmployeePayrunResult {
  return computeEmployeePayrun(buildEmployeePayrunComputeInput(input));
}

export function payrunItemPatchFromResult(result: EmployeePayrunResult) {
  return {
    gross_pay: result.gross.toFixed(2),
    statutory_wage_base: result.epfWageBase.toFixed(2),
    epf_wage_base: result.epfWageBase.toFixed(2),
    socso_wage_base: result.socsoWageBase.toFixed(2),
    pcb_wage_base: result.pcbWageBase.toFixed(2),
    epf_employee: result.epfEmployee.toFixed(2),
    epf_employer: result.epfEmployer.toFixed(2),
    socso_employee: result.socsoEmployee.toFixed(2),
    socso_employer: result.socsoEmployer.toFixed(2),
    eis_employee: result.eisEmployee.toFixed(2),
    eis_employer: result.eisEmployer.toFixed(2),
    pcb: result.pcb.toFixed(2),
    hrdf_employer: result.hrdfEmployer.toFixed(2),
    lindung_employee: result.lindungEmployee.toFixed(2),
    lindung_employer: result.lindungEmployer.toFixed(2),
    net_pay: result.net.toFixed(2),
    requires_resolution: result.requiresResolution,
    anomaly_flags: result.anomalyFlags,
  };
}
