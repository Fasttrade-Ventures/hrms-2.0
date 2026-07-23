import { ceilToNext5Sen, ceilToNextRinggit, money, roundRinggit, type Money } from "../money";

export type EpfWageRounding = "none" | "ceil_rm50";

export function epfContributableWage(gross: Money, rounding: EpfWageRounding): Money {
  if (rounding === "ceil_rm50") {
    return roundRinggit(gross.div(50).ceil().mul(50));
  }
  return gross;
}

export function epfEmployee(contributableWage: Money, ratePercent: number): Money {
  return ceilToNextRinggit(contributableWage.mul(ratePercent).div(100));
}

export function epfEmployer(contributableWage: Money, ratePercent: number): Money {
  return ceilToNextRinggit(contributableWage.mul(ratePercent).div(100));
}

/** EIS assumed wage from PERKESO SOCSO Cat 1 band midpoints. */
const SOCSO_BAND_CAPS = [
  30, 50, 70, 100, 140, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500,
  1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200,
  3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800, 4900,
  5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000,
];

function eisAssumedWage(wage: Money): Money {
  const w = Math.min(wage.toNumber(), 6000);
  if (w <= 0) return money(0);
  let prev = 0;
  for (const cap of SOCSO_BAND_CAPS) {
    if (w <= cap) return money((prev + cap) / 2);
    prev = cap;
  }
  return money(5950);
}

export function eisEmployee(statutoryWageBase: Money, eligible: boolean): Money {
  if (!eligible) return money(0);
  return eisAssumedWage(statutoryWageBase).mul(0.002).toDecimalPlaces(2);
}

export function eisEmployer(statutoryWageBase: Money, eligible: boolean): Money {
  return eisEmployee(statutoryWageBase, eligible);
}

function residentTaxAnnual(chargeableIncome: Money): Money {
  let x = chargeableIncome.lt(0) ? money(0) : chargeableIncome;
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
    if (x.lte(0)) break;
    const bandWidth = money(to === Infinity ? x.toNumber() : to - from);
    const slice = x.lt(bandWidth) ? x : bandWidth;
    tax = tax.add(slice.mul(rate));
    x = x.sub(slice);
  }

  if (chargeableIncome.gt(0) && chargeableIncome.lte(35000)) {
    tax = tax.sub(400);
    if (tax.lt(0)) tax = money(0);
  }

  return tax.toDecimalPlaces(2);
}

/** Progressive resident PCB — simplified annualisation scaffold. */
export function pcbMtdComputerised(
  monthlyGross: Money,
  monthlyEpf: Money,
  additionalReliefs: Money,
  ytdGross: Money,
  ytdEpf: Money,
  ytdPcb: Money,
  month: number,
  ceil5Sen = false,
): Money {
  const projectedAnnualGross = ytdGross.gt(0)
    ? ytdGross.add(monthlyGross.mul(13 - month))
    : monthlyGross.mul(12);
  const projectedAnnualEpf = ytdEpf.gt(0)
    ? ytdEpf.add(monthlyEpf.mul(13 - month))
    : monthlyEpf.mul(12);

  const personalRelief = money(9000);
  const epfReliefCap = money(4000);
  const epfRelief = projectedAnnualEpf.gt(epfReliefCap) ? epfReliefCap : projectedAnnualEpf;
  const chargeable = projectedAnnualGross.sub(personalRelief).sub(epfRelief).sub(additionalReliefs);
  const taxable = chargeable.lt(0) ? money(0) : chargeable;

  const annualTax = residentTaxAnnual(taxable);

  const noPriorPay = ytdGross.lte(0) && ytdEpf.lte(0);
  let monthlyPcb: Money;
  if (ytdPcb.gt(0) || !noPriorPay) {
    const remainingMonths = Math.max(1, 13 - month);
    monthlyPcb = annualTax.sub(ytdPcb).div(remainingMonths);
  } else {
    monthlyPcb = annualTax.div(12);
  }

  if (monthlyPcb.lt(0)) monthlyPcb = money(0);
  const rounded = ceil5Sen ? ceilToNext5Sen(monthlyPcb) : monthlyPcb.toDecimalPlaces(2);
  return rounded;
}
