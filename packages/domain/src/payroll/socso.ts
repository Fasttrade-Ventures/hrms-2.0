import { money, type Money } from "../money";
import { SOCSO_CAT1_BANDS, SOCSO_CAT2_BANDS } from "./socso-bands";

export type SocsoCategory = "cat1" | "cat2";

const WAGE_CEILING = 6000;

export function detectSocsoCategory(dateOfBirth: string, asOf: string): SocsoCategory {
  const dob = new Date(dateOfBirth);
  const ref = new Date(asOf);
  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age >= 60 ? "cat2" : "cat1";
}

function findBand(wage: number, category: SocsoCategory) {
  const capped = Math.min(Math.max(wage, 0), WAGE_CEILING);
  const bands = category === "cat2" ? SOCSO_CAT2_BANDS : SOCSO_CAT1_BANDS;
  return bands.find((band) => capped <= band.max) ?? bands[bands.length - 1]!;
}

export function lookupSocsoContribution(
  wage: Money,
  category: SocsoCategory,
): { employee: Money; employer: Money; wageBand: number } {
  const band = findBand(wage.toNumber(), category);
  return {
    wageBand: band.max,
    employee: money(band.ee),
    employer: money(band.er),
  };
}

export function capSocsoWage(wage: Money): Money {
  return money(Math.min(wage.toNumber(), WAGE_CEILING));
}
