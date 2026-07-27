import { countWorkingDays } from "../leave/working-days";
import { money, type Money } from "../money";

export function workingDaysInPeriod(
  periodStart: string,
  periodEnd: string,
  holidays: string[] = [],
): number {
  return countWorkingDays(new Date(periodStart), new Date(periodEnd), {
    weekendMode: "sat_sun",
    holidays,
  });
}

export function prorateMonthlySalary(
  monthlySalary: Money,
  employedWorkingDays: number,
  totalWorkingDays: number,
): Money {
  if (totalWorkingDays <= 0 || employedWorkingDays <= 0) return money(0);
  if (employedWorkingDays >= totalWorkingDays) return monthlySalary.toDecimalPlaces(2);
  return monthlySalary.mul(employedWorkingDays).div(totalWorkingDays).toDecimalPlaces(2);
}

export function unpaidLeaveDeduction(
  monthlySalary: Money,
  unpaidDays: number,
  totalWorkingDays: number,
): Money {
  if (unpaidDays <= 0 || totalWorkingDays <= 0) return money(0);
  return monthlySalary.mul(unpaidDays).div(totalWorkingDays).toDecimalPlaces(2);
}

export function employedWorkingDays(
  joinDate: string,
  periodStart: string,
  periodEnd: string,
  holidays: string[] = [],
): number {
  const start = joinDate > periodStart ? joinDate : periodStart;
  if (start > periodEnd) return 0;
  return workingDaysInPeriod(start, periodEnd, holidays);
}
