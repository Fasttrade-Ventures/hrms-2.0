/**
 * Australian pay file for Xero and MYOB. One CSV carries time-based earnings only.
 * BukuHR does not calculate PAYG, super, awards, or Single Touch Payroll.
 */

import { daysToHours } from "../leave/hours";

export type AuEarningName =
  | "Ordinary"
  | "Overtime"
  | "Annual leave"
  | "Personal leave"
  | "Allowance";

export type AuPayFileLine = {
  employeeNumber: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  earningName: AuEarningName;
  hours: number | null;
  rate: number | null;
  amount: number;
};

export const AU_PAY_FILE_HEADER =
  "employee_number,employee_name,period_start,period_end,earning_name,hours,rate,amount";

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function lineToCells(line: AuPayFileLine): string[] {
  if (!line.employeeNumber || line.employeeNumber.trim() === "") {
    throw new Error("Pay file line is missing an employee number.");
  }

  let hours = "";
  let rate = "";
  let amount: number;

  if (line.earningName === "Allowance") {
    amount = round2(line.amount);
  } else {
    if (line.hours === null || line.rate === null) {
      throw new Error(`${line.earningName} line for ${line.employeeNumber} needs hours and rate.`);
    }
    hours = String(line.hours);
    rate = String(line.rate);
    amount = round2(line.hours * line.rate);
  }

  return [
    line.employeeNumber.trim(),
    line.employeeName,
    line.periodStart,
    line.periodEnd,
    line.earningName,
    hours,
    rate,
    amount.toFixed(2),
  ].map(escapeField);
}

/** Builds the Xero and MYOB import CSV. Throws if any employee number is blank. */
export function buildAuPayFileCsv(lines: AuPayFileLine[]): string {
  return [AU_PAY_FILE_HEADER, ...lines.map((line) => lineToCells(line).join(","))].join("\n");
}

/**
 * "personal", "sick", "carer", "medical", or "hospital" means Personal leave.
 * Everything else is Annual leave.
 */
export function auLeaveEarningName(leaveTypeName: string): "Annual leave" | "Personal leave" {
  return /personal|sick|carer|medical|hospital/i.test(leaveTypeName) ? "Personal leave" : "Annual leave";
}

export type AuPayFileEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  /** employee_profiles.hourly_rate. Null means no rate is stored. */
  hourlyRate: number | null;
};

export type AuPayFileSession = {
  employeeId: string;
  clockInAt: string | null;
  clockOutAt: string | null;
};

export type AuPayFileOvertime = {
  employeeId: string;
  hours: number;
  /** Multiplier stored on the request, such as "1.5". */
  rateType: string;
  /** Hourly rate stored on the request, if any. */
  hourlyRate: number | null;
};

export type AuPayFileLeave = {
  employeeId: string;
  days: number;
  leaveTypeName: string;
  isUnpaid: boolean;
};

export type AuPayFileAllowance = {
  employeeId: string;
  amount: number;
};

export type MapAuPayFileInput = {
  periodStart: string;
  periodEnd: string;
  standardDayHours: number;
  employees: AuPayFileEmployee[];
  sessions: AuPayFileSession[];
  overtime: AuPayFileOvertime[];
  leave: AuPayFileLeave[];
  allowances: AuPayFileAllowance[];
};

/**
 * Maps already-filtered period rows to pay file lines.
 * Employees with no activity in the period stay out of the file. An employee who has
 * ordinary hours, overtime, paid leave, or an allowance but no stored hourly rate makes
 * this throw, naming each such employee, so their time is never dropped silently.
 */
export function mapAuPayFileLines(input: MapAuPayFileInput): AuPayFileLine[] {
  const rated = new Map<string, AuPayFileEmployee & { hourlyRate: number }>();
  const unrated = new Map<string, AuPayFileEmployee>();
  for (const employee of input.employees) {
    if (employee.hourlyRate !== null && Number.isFinite(employee.hourlyRate) && employee.hourlyRate > 0) {
      rated.set(employee.id, { ...employee, hourlyRate: employee.hourlyRate });
    } else {
      unrated.set(employee.id, employee);
    }
  }

  const missingRate = new Set<string>();
  const flagIfUnrated = (employeeId: string) => {
    if (unrated.has(employeeId)) missingRate.add(employeeId);
  };
  for (const session of input.sessions) {
    if (!session.clockInAt || !session.clockOutAt) continue;
    const ms = Date.parse(session.clockOutAt) - Date.parse(session.clockInAt);
    if (Number.isFinite(ms) && ms > 0) flagIfUnrated(session.employeeId);
  }
  for (const request of input.overtime) {
    if (request.hours > 0) flagIfUnrated(request.employeeId);
  }
  for (const leave of input.leave) {
    if (!leave.isUnpaid && leave.days > 0) flagIfUnrated(leave.employeeId);
  }
  for (const allowance of input.allowances) {
    if (allowance.amount !== 0) flagIfUnrated(allowance.employeeId);
  }
  if (missingRate.size > 0) {
    const names = [...unrated.values()]
      .filter((employee) => missingRate.has(employee.id))
      .map((employee) => `${employee.fullName} (${employee.employeeNumber})`);
    throw new Error(
      `Cannot build the pay file. No hourly rate is set for ${names.join(", ")}. Set an hourly rate on the employee record, then download again.`,
    );
  }

  const head = (employee: AuPayFileEmployee) => ({
    employeeNumber: employee.employeeNumber,
    employeeName: employee.fullName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });

  const lines: AuPayFileLine[] = [];

  // Ordinary: closed sessions only, summed per employee.
  const ordinaryMs = new Map<string, number>();
  for (const session of input.sessions) {
    if (!rated.has(session.employeeId) || !session.clockInAt || !session.clockOutAt) continue;
    const ms = Date.parse(session.clockOutAt) - Date.parse(session.clockInAt);
    if (!Number.isFinite(ms) || ms <= 0) continue;
    ordinaryMs.set(session.employeeId, (ordinaryMs.get(session.employeeId) ?? 0) + ms);
  }
  for (const [employeeId, ms] of ordinaryMs) {
    const employee = rated.get(employeeId)!;
    const hours = round2(ms / 3_600_000);
    lines.push({
      ...head(employee),
      earningName: "Ordinary",
      hours,
      rate: employee.hourlyRate,
      amount: round2(hours * employee.hourlyRate),
    });
  }

  // Overtime: one line per approved request.
  for (const request of input.overtime) {
    const employee = rated.get(request.employeeId);
    if (!employee) continue;
    const multiplier = Number(request.rateType);
    const rate =
      request.hourlyRate !== null && request.hourlyRate > 0
        ? request.hourlyRate
        : round2(employee.hourlyRate * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1));
    lines.push({
      ...head(employee),
      earningName: "Overtime",
      hours: request.hours,
      rate,
      amount: round2(request.hours * rate),
    });
  }

  // Paid leave: days to hours, summed per employee and earning name.
  const leaveHours = new Map<string, { employeeId: string; name: "Annual leave" | "Personal leave"; hours: number }>();
  for (const leave of input.leave) {
    if (leave.isUnpaid || !rated.has(leave.employeeId)) continue;
    const name = auLeaveEarningName(leave.leaveTypeName);
    const key = `${leave.employeeId}|${name}`;
    const entry = leaveHours.get(key) ?? { employeeId: leave.employeeId, name, hours: 0 };
    entry.hours = round2(entry.hours + daysToHours(leave.days, input.standardDayHours));
    leaveHours.set(key, entry);
  }
  for (const entry of leaveHours.values()) {
    const employee = rated.get(entry.employeeId)!;
    lines.push({
      ...head(employee),
      earningName: entry.name,
      hours: entry.hours,
      rate: employee.hourlyRate,
      amount: round2(entry.hours * employee.hourlyRate),
    });
  }

  // Allowances: stored amount, no hours or rate.
  for (const allowance of input.allowances) {
    const employee = rated.get(allowance.employeeId);
    if (!employee) continue;
    lines.push({
      ...head(employee),
      earningName: "Allowance",
      hours: null,
      rate: null,
      amount: round2(allowance.amount),
    });
  }

  return lines;
}
