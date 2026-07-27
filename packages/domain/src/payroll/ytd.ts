export type PayFrequency = "monthly" | "weekly" | "biweekly";

export function remainingPeriodsInYear(frequency: PayFrequency, asOf: string): number {
  const date = new Date(asOf);
  const month = date.getMonth() + 1;

  if (frequency === "monthly") return Math.max(1, 13 - month);

  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil((date.getTime() - start.getTime()) / 86_400_000 / 7);

  if (frequency === "weekly") return Math.max(1, 53 - week);
  return Math.max(1, 27 - Math.ceil(week / 2));
}

export function annualizePeriodGross(
  periodGross: number,
  frequency: PayFrequency,
  hasYtd: boolean,
): number {
  if (hasYtd) return periodGross;
  if (frequency === "weekly") return periodGross * 52;
  if (frequency === "biweekly") return periodGross * 26;
  return periodGross * 12;
}
