import { ceilToNext5Sen, money, type Money } from "../money";
import { annualizePeriodGross, remainingPeriodsInYear, type PayFrequency } from "./ytd";

export type Tp1Reliefs = {
  spouse: Money;
  children: Money;
  other: Money;
  zakatAnnual: Money;
};

export type PcbYtd = {
  gross: Money;
  epf: Money;
  pcb: Money;
  socso?: Money;
  eis?: Money;
};

export type PcbMtdInput = {
  frequency: PayFrequency;
  periodGross: Money;
  periodEpf: Money;
  periodSocso?: Money;
  periodEis?: Money;
  tp1: Tp1Reliefs;
  ytd: PcbYtd;
  asOf: string;
  ceil5Sen?: boolean;
  /** LHDN simplified PCB threshold uses married vs single income-after-EPF limits. */
  maritalCategory?: "single" | "married";
};

const PCB_MONTHLY_THRESHOLD_AFTER_EPF = {
  single: 2851,
  married: 3851,
} as const;

function residentTaxAnnual(chargeableIncome: Money): Money {
  let remaining = chargeableIncome.lt(0) ? money(0) : chargeableIncome;
  let tax = money(0);

  const bands: Array<[number, number, number]> = [
    [0, 5000, 0],
    [5000, 20000, 0.01],
    [20000, 35000, 0.03],
    [35000, 50000, 0.08],
    [50000, 70000, 0.13],
    [70000, 100000, 0.21],
    [100000, 250000, 0.24],
    [250000, 400000, 0.245],
    [400000, 600000, 0.25],
    [600000, 1000000, 0.26],
    [1000000, Infinity, 0.28],
  ];

  for (const [from, to, rate] of bands) {
    if (remaining.lte(0)) break;
    const width = money(to === Infinity ? remaining.toNumber() : to - from);
    const slice = remaining.lt(width) ? remaining : width;
    tax = tax.add(slice.mul(rate));
    remaining = remaining.sub(slice);
  }

  if (chargeableIncome.gt(0) && chargeableIncome.lte(35000)) {
    tax = tax.sub(400);
    if (tax.lt(0)) tax = money(0);
  }

  return tax.toDecimalPlaces(2);
}

export function pcbMtdFull(input: PcbMtdInput): Money {
  const remaining = remainingPeriodsInYear(input.frequency, input.asOf);
  const hasYtd = input.ytd.gross.gt(0) || input.ytd.epf.gt(0) || input.ytd.pcb.gt(0);

  const projectedAnnualGross = hasYtd
    ? input.ytd.gross.add(input.periodGross.mul(remaining))
    : money(annualizePeriodGross(input.periodGross.toNumber(), input.frequency, false));

  const projectedAnnualEpf = hasYtd
    ? input.ytd.epf.add(input.periodEpf.mul(remaining))
    : input.periodEpf.mul(input.frequency === "monthly" ? 12 : input.frequency === "weekly" ? 52 : 26);

  const periodSocso = input.periodSocso ?? money(0);
  const periodEis = input.periodEis ?? money(0);
  const periodsPerYear =
    input.frequency === "monthly" ? 12 : input.frequency === "weekly" ? 52 : 26;

  const projectedAnnualSocso = input.ytd.socso?.gt(0)
    ? input.ytd.socso.add(periodSocso.mul(remaining))
    : periodSocso.mul(periodsPerYear);

  const projectedAnnualEis = input.ytd.eis?.gt(0)
    ? input.ytd.eis.add(periodEis.mul(remaining))
    : periodEis.mul(periodsPerYear);

  const personalRelief = money(9000);
  const epfReliefCap = money(4000);
  const epfRelief = projectedAnnualEpf.gt(epfReliefCap) ? epfReliefCap : projectedAnnualEpf;
  const additionalReliefs = input.tp1.spouse.add(input.tp1.children).add(input.tp1.other);
  const statutoryReliefs = projectedAnnualSocso.add(projectedAnnualEis);

  const chargeable = projectedAnnualGross
    .sub(personalRelief)
    .sub(epfRelief)
    .sub(additionalReliefs)
    .sub(statutoryReliefs);
  const taxable = chargeable.lt(0) ? money(0) : chargeable;

  let annualTax = residentTaxAnnual(taxable);
  if (input.tp1.zakatAnnual.gt(0)) {
    annualTax = annualTax.sub(input.tp1.zakatAnnual);
    if (annualTax.lt(0)) annualTax = money(0);
  }

  let monthlyPcb: Money;
  if (input.ytd.pcb.gt(0) || hasYtd) {
    monthlyPcb = annualTax.sub(input.ytd.pcb).div(remaining);
  } else {
    monthlyPcb = annualTax.div(input.frequency === "monthly" ? 12 : input.frequency === "weekly" ? 52 : 26);
  }

  if (monthlyPcb.lt(0)) monthlyPcb = money(0);

  const maritalCategory = input.maritalCategory ?? "single";
  const incomeAfterEpf = input.periodGross.sub(input.periodEpf);
  const pcbThreshold = money(PCB_MONTHLY_THRESHOLD_AFTER_EPF[maritalCategory]);
  if (!hasYtd && incomeAfterEpf.lt(pcbThreshold)) {
    monthlyPcb = money(0);
  }

  return input.ceil5Sen === false
    ? monthlyPcb.toDecimalPlaces(2)
    : ceilToNext5Sen(monthlyPcb);
}
