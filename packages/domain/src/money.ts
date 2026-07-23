import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

export function money(value: string | number): Money {
  return new Decimal(value);
}

export function formatRm(amount: Money): string {
  return amount.toFixed(2);
}

export function roundRinggit(amount: Money): Money {
  return amount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

export function ceilToNextRinggit(amount: Money): Money {
  return amount.ceil();
}

export function ceilToNext5Sen(amount: Money): Money {
  return amount.mul(20).ceil().div(20);
}
