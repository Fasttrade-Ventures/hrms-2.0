import { money, type Money } from "../money";
import type { StatutoryRuleContext } from "./statutory-context";
import { DEFAULT_STATUTORY_RULES } from "./statutory-context";

export type SocsoCategory = "cat1" | "cat2";

function findBand(wage: number, category: SocsoCategory, rules: StatutoryRuleContext) {
  const capped = Math.min(Math.max(wage, 0), rules.wageCeiling);
  const bands = category === "cat2" ? rules.socsoCat2Bands : rules.socsoCat1Bands;
  return bands.find((band) => capped <= band.max) ?? bands[bands.length - 1]!;
}

export function detectSocsoCategory(dateOfBirth: string, asOf: string): SocsoCategory {
  const dob = new Date(dateOfBirth);
  const ref = new Date(asOf);
  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age >= 60 ? "cat2" : "cat1";
}

export function lookupSocsoContribution(
  wage: Money,
  category: SocsoCategory,
  rules: StatutoryRuleContext = DEFAULT_STATUTORY_RULES,
): { employee: Money; employer: Money; wageBand: number } {
  const band = findBand(wage.toNumber(), category, rules);
  return {
    wageBand: band.max,
    employee: money(band.ee),
    employer: money(band.er),
  };
}

export function capSocsoWage(wage: Money, rules: StatutoryRuleContext = DEFAULT_STATUTORY_RULES): Money {
  return money(Math.min(wage.toNumber(), rules.wageCeiling));
}
