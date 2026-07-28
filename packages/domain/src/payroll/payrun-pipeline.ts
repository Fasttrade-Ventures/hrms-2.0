import { money, roundRinggit, type Money } from "../money";
import { eisEmployee, eisEmployer, epfContributableWage, epfEmployee, epfEmployer, type EpfWageRounding } from "./malaysia-statutory";
import { pcbMtdFull } from "./pcb-mtd";
import { detectSocsoCategory, lookupSocsoContribution, type SocsoCategory } from "./socso";
import type { StatutoryRuleContext } from "./statutory-context";
import { DEFAULT_STATUTORY_RULES } from "./statutory-context";
import type { PayFrequency } from "./ytd";

export type ComponentFlags = {
  isEpf: boolean;
  isSocso: boolean;
  isEis: boolean;
  isPcb: boolean;
  isHrdf: boolean;
};

export type PayrunLine = { code: string; amount: Money; flags: ComponentFlags };

export type EmployeePayrunInput = {
  lines: PayrunLine[];
  dateOfBirth: string;
  asOf: string;
  eisEligible: boolean;
  epfEmployeeRate: number;
  epfEmployerRate: number;
  voluntaryEpfExtraRate: number;
  socsoCategoryOverride?: SocsoCategory;
  frequency: PayFrequency;
  ytd: { gross: Money; epf: Money; pcb: Money; socso?: Money; eis?: Money };
  tp1: { zakatAnnual: Money; spouse: Money; children: Money; other: Money };
  zakatMonthly: Money;
  hrdfEnabled: boolean;
  hrdfRate: number;
  lindungEnabled: boolean;
  lindungRate: number;
  lindungEmployerRate: number;
  epfWageRounding?: EpfWageRounding;
  isForeignWorker?: boolean;
  maritalCategory?: "single" | "married";
  statutoryRules?: StatutoryRuleContext;
};

export type EmployeePayrunResult = {
  gross: Money;
  epfWageBase: Money;
  socsoWageBase: Money;
  pcbWageBase: Money;
  epfEmployee: Money;
  epfEmployer: Money;
  socsoEmployee: Money;
  socsoEmployer: Money;
  eisEmployee: Money;
  eisEmployer: Money;
  pcb: Money;
  hrdfEmployer: Money;
  lindungEmployee: Money;
  lindungEmployer: Money;
  zakatDeduction: Money;
  anomalyFlags: string[];
  net: Money;
  requiresResolution: boolean;
};

function resolveEpfRates(
  contributable: Money,
  employeeRate: number,
  employerRate: number,
  isForeignWorker: boolean,
): { employeeRate: number; employerRate: number } {
  if (!isForeignWorker) {
    return { employeeRate, employerRate };
  }
  return {
    employeeRate: 2,
    employerRate: contributable.gt(5000) ? 13 : 12,
  };
}

function detectAnomalies(input: {
  gross: Money;
  epfEmployee: Money;
  net: Money;
}): string[] {
  const flags: string[] = [];
  if (input.net.lt(0)) flags.push("negative_net");
  if (input.gross.gt(0) && input.epfEmployee.div(input.gross).gt(0.2)) {
    flags.push("high_epf_rate");
  }
  return flags;
}

function sumFlagged(lines: PayrunLine[], flag: keyof ComponentFlags): Money {
  return lines.reduce((total, line) => (line.flags[flag] ? total.add(line.amount) : total), money(0));
}

export function computeEmployeePayrun(input: EmployeePayrunInput): EmployeePayrunResult {
  const rules = input.statutoryRules ?? DEFAULT_STATUTORY_RULES;
  const gross = input.lines.reduce((total, line) => total.add(line.amount), money(0));
  const epfWageBase = sumFlagged(input.lines, "isEpf");
  const socsoWageBase = sumFlagged(input.lines, "isSocso");
  const pcbWageBase = sumFlagged(input.lines, "isPcb");
  const hrdfWageBase = sumFlagged(input.lines, "isHrdf");
  const statutoryBase = epfWageBase.gt(0) ? epfWageBase : gross;

  const contributable = epfContributableWage(statutoryBase, input.epfWageRounding ?? "none");
  const epfRates = resolveEpfRates(
    contributable,
    input.epfEmployeeRate + input.voluntaryEpfExtraRate,
    input.epfEmployerRate,
    input.isForeignWorker ?? false,
  );
  const epfEmp = epfEmployee(contributable, epfRates.employeeRate);
  const epfEr = epfEmployer(contributable, epfRates.employerRate);

  const socsoCategory =
    input.socsoCategoryOverride ?? detectSocsoCategory(input.dateOfBirth, input.asOf);
  const socsoWage = socsoWageBase.gt(0) ? socsoWageBase : statutoryBase;
  const socso = lookupSocsoContribution(socsoWage, socsoCategory, rules);

  const eisWage = socsoWageBase.gt(0) ? socsoWageBase : statutoryBase;
  const eisEmp = eisEmployee(eisWage, input.eisEligible, rules);
  const eisEr = eisEmployer(eisWage, input.eisEligible, rules);

  const pcbGross = pcbWageBase.gt(0) ? pcbWageBase : statutoryBase;
  const pcb = pcbMtdFull({
    frequency: input.frequency,
    periodGross: pcbGross,
    periodEpf: epfEmp,
    periodSocso: socso.employee,
    periodEis: eisEmp,
    tp1: input.tp1,
    ytd: input.ytd,
    asOf: input.asOf,
    maritalCategory: input.maritalCategory,
  });

  const hrdfBase = hrdfWageBase.gt(0) ? hrdfWageBase : statutoryBase;
  const hrdfEmployer = input.hrdfEnabled ? roundRinggit(hrdfBase.mul(input.hrdfRate)) : money(0);

  const lindungBase = socsoWage.gt(0) ? socsoWage : statutoryBase;
  const lindungEmployee = input.lindungEnabled
    ? roundRinggit(lindungBase.mul(input.lindungRate))
    : money(0);
  const lindungEmployer =
    input.lindungEnabled && input.lindungEmployerRate > 0
      ? roundRinggit(lindungBase.mul(input.lindungEmployerRate))
      : money(0);
  const zakatDeduction = input.zakatMonthly.gt(0) ? roundRinggit(input.zakatMonthly) : money(0);

  const deductions = epfEmp.add(socso.employee).add(eisEmp).add(pcb).add(lindungEmployee).add(zakatDeduction);
  const net = roundRinggit(gross.sub(deductions));
  const anomalyFlags = detectAnomalies({ gross, epfEmployee: epfEmp, net });

  return {
    gross,
    epfWageBase: statutoryBase,
    socsoWageBase: socsoWage,
    pcbWageBase: pcbGross,
    epfEmployee: epfEmp,
    epfEmployer: epfEr,
    socsoEmployee: socso.employee,
    socsoEmployer: socso.employer,
    eisEmployee: eisEmp,
    eisEmployer: eisEr,
    pcb,
    hrdfEmployer,
    lindungEmployee,
    lindungEmployer,
    zakatDeduction,
    anomalyFlags,
    net,
    requiresResolution: net.lt(0),
  };
}
