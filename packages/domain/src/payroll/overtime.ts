import { money, type Money } from "../money";

/**
 * Overtime Pay calculation:
 * - If hourlyRateOverride is provided and > 0, calculates: hourlyRateOverride × multiplier × hours.
 * - Otherwise falls back to Employment Act formula: (monthlyBasic / divisor) × multiplier × hours.
 */
export function computeOtPay(
  hours: number,
  multiplier: number,
  monthlyBasic: Money,
  divisor = 26,
  hourlyRateOverride?: Money | null,
): Money {
  if (hours <= 0) return money(0);
  if (hourlyRateOverride && hourlyRateOverride.gt(0)) {
    return hourlyRateOverride.mul(hours).mul(multiplier).toDecimalPlaces(2);
  }
  if (divisor <= 0) return money(0);
  return monthlyBasic.div(divisor).mul(hours).mul(multiplier).toDecimalPlaces(2);
}

