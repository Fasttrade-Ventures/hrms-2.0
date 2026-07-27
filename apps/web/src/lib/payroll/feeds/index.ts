import {
  employedWorkingDays,
  money,
  prorateMonthlySalary,
  unpaidLeaveDeduction,
  workingDaysInPeriod,
  type PayrunLine,
} from "@hrms/domain";

import { createClient } from "@/lib/supabase/server";

import { hourlyPayFromAttendance, fetchAttendanceHoursForPeriod } from "./attendance";
import { aggregateClaimsByEmployee, fetchApprovedClaimsForPeriod } from "./claims";
import { fetchUnpaidLeaveDaysForPeriod } from "./leave";
import { aggregateOtPayByEmployee, fetchApprovedOtForPeriod } from "./ot";
import {
  DEDUCTION_FLAGS,
  EARNING_FLAGS,
  REIMB_FLAGS,
  type EmployeePayInput,
  loadHolidayDates,
} from "./shared";

export type { EmployeePayInput } from "./shared";
export { fetchApprovedOtForPeriod } from "./ot";
export { fetchApprovedClaimsForPeriod } from "./claims";
export { fetchUnpaidLeaveDaysForPeriod } from "./leave";
export { fetchAttendanceHoursForPeriod } from "./attendance";

export async function buildEmployeePayLines(
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  employees: EmployeePayInput[],
): Promise<Map<string, PayrunLine[]>> {
  const supabase = await createClient();
  const holidays = await loadHolidayDates(organizationId);
  const totalWorkingDays = workingDaysInPeriod(periodStart, periodEnd, holidays);
  const linesByEmployee = new Map<string, PayrunLine[]>();
  const employeeIds = employees.map((employee) => employee.employeeId);
  if (employeeIds.length === 0) return linesByEmployee;

  const [otRows, claimRows, unpaidByEmployee, allowanceRows, attendanceHours] = await Promise.all([
    fetchApprovedOtForPeriod(supabase, organizationId, periodStart, periodEnd, employeeIds),
    fetchApprovedClaimsForPeriod(supabase, organizationId, periodStart, periodEnd, employeeIds),
    fetchUnpaidLeaveDaysForPeriod(supabase, organizationId, periodStart, periodEnd, employeeIds),
    supabase
      .from("employee_recurring_allowances")
      .select(
        "employee_id, amount, payroll_components(code, is_epf, is_socso, is_eis, is_pcb, is_hrdf)",
      )
      .eq("organization_id", organizationId)
      .lte("effective_from", periodEnd)
      .or(`effective_to.is.null,effective_to.gte.${periodStart}`)
      .in("employee_id", employeeIds)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        return data ?? [];
      }),
    fetchAttendanceHoursForPeriod(supabase, organizationId, periodStart, periodEnd, employees),
  ]);

  const otByEmployee = aggregateOtPayByEmployee(otRows, employees);
  const claimsByEmployee = aggregateClaimsByEmployee(claimRows);

  const allowancesByEmployee = new Map<string, PayrunLine[]>();
  for (const row of allowanceRows) {
    const component = (
      Array.isArray(row.payroll_components) ? row.payroll_components[0] : row.payroll_components
    ) as {
      code?: string;
      is_epf?: boolean;
      is_socso?: boolean;
      is_eis?: boolean;
      is_pcb?: boolean;
      is_hrdf?: boolean;
    } | null;
    if (!component?.code) continue;
    const line: PayrunLine = {
      code: component.code,
      amount: money(row.amount),
      flags: {
        isEpf: Boolean(component.is_epf),
        isSocso: Boolean(component.is_socso),
        isEis: Boolean(component.is_eis),
        isPcb: Boolean(component.is_pcb),
        isHrdf: Boolean(component.is_hrdf),
      },
    };
    const existing = allowancesByEmployee.get(row.employee_id) ?? [];
    existing.push(line);
    allowancesByEmployee.set(row.employee_id, existing);
  }

  for (const employee of employees) {
    const lines: PayrunLine[] = [];
    const basic = money(employee.monthlyBasic);

    if (employee.payBasis === "hourly") {
      const hours = attendanceHours.get(employee.employeeId) ?? 0;
      const hourlyPay = hourlyPayFromAttendance(hours, employee.hourlyRate);
      lines.push({ code: "BASIC", amount: money(hourlyPay), flags: EARNING_FLAGS });
    } else {
      const employedDays = employedWorkingDays(employee.joinDate, periodStart, periodEnd, holidays);
      const proratedBasic = prorateMonthlySalary(basic, employedDays, totalWorkingDays);
      lines.push({ code: "BASIC", amount: proratedBasic, flags: EARNING_FLAGS });
    }

    for (const allowanceLine of allowancesByEmployee.get(employee.employeeId) ?? []) {
      lines.push(allowanceLine);
    }

    const otPay = otByEmployee.get(employee.employeeId) ?? 0;
    if (otPay > 0) {
      lines.push({ code: "OT_PAY", amount: money(otPay), flags: EARNING_FLAGS });
    }

    const claims = claimsByEmployee.get(employee.employeeId);
    if (claims?.taxable) {
      lines.push({ code: "CLAIM_TAXABLE", amount: money(claims.taxable), flags: EARNING_FLAGS });
    }
    if (claims?.reimb) {
      lines.push({ code: "CLAIM_REIMB", amount: money(claims.reimb), flags: REIMB_FLAGS });
    }

    const basicLine = lines.find((line) => line.code === "BASIC")?.amount ?? money(0);
    const unpaidDays = unpaidByEmployee.get(employee.employeeId) ?? 0;
    if (unpaidDays > 0) {
      const deduction = unpaidLeaveDeduction(basicLine, unpaidDays, totalWorkingDays);
      if (deduction.gt(0)) {
        lines.push({ code: "DED_UNPAID_LEAVE", amount: deduction.mul(-1), flags: DEDUCTION_FLAGS });
      }
    }

    linesByEmployee.set(employee.employeeId, lines);
  }

  return linesByEmployee;
}
