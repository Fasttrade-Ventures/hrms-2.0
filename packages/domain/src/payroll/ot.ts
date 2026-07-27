import { money, type Money } from "../money";

/** Employment Act default: monthly salary / 26 × multiplier × hours. */
export function computeOtPay(
  hours: number,
  multiplier: number,
  monthlyBasic: Money,
  divisor = 26,
): Money {
  if (hours <= 0 || divisor <= 0) return money(0);
  return monthlyBasic.div(divisor).mul(hours).mul(multiplier).toDecimalPlaces(2);
}
