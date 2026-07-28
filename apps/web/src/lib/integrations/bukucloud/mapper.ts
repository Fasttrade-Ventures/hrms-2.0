import type { BukucloudPayrollPayload, PayrunTotalsForBukucloud } from "./types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildBukucloudReference(payrunId: string): string {
  return `HRMS-${payrunId.slice(0, 8).toUpperCase()}`;
}

export function mapPayrunToBukucloudPayload(input: {
  payrunId: string;
  payDate: string;
  periodLabel: string;
  bankAccountCode: string;
  totals: PayrunTotalsForBukucloud;
}): BukucloudPayrollPayload {
  const epfPayable = roundMoney(input.totals.epfEmployee + input.totals.epfEmployer);
  const socsoPayable = roundMoney(input.totals.socsoEmployee + input.totals.socsoEmployer);
  const eisPayable = roundMoney(input.totals.eisEmployee + input.totals.eisEmployer);
  const hrdPayable = roundMoney(input.totals.hrdfEmployer);

  return {
    period_date: input.payDate,
    description: `HRMS payroll ${input.periodLabel}`,
    reference_number: buildBukucloudReference(input.payrunId),
    bank_account_code: input.bankAccountCode,
    gross_salaries: roundMoney(input.totals.gross),
    employer_epf: roundMoney(input.totals.epfEmployer),
    employer_socso: roundMoney(input.totals.socsoEmployer),
    employer_eis: roundMoney(input.totals.eisEmployer),
    employer_hrd: hrdPayable,
    epf_payable: epfPayable,
    socso_payable: socsoPayable,
    eis_payable: eisPayable,
    pcb_payable: roundMoney(input.totals.pcb),
    hrd_payable: hrdPayable,
    net_pay: roundMoney(input.totals.net),
  };
}
