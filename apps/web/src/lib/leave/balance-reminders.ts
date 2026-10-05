import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForEmployee } from "@/lib/approvals/service";
import { queueNotification } from "@/lib/notifications/queue";
import { isReplacementLeaveType } from "@/lib/leave/replacement-credit";

export const LOW_BALANCE_DAYS = 3;
export const EXPIRY_WARNING_DAYS = 30;

export type LeaveReminderReason = "low_balance" | "expiring" | "low_and_expiring";

export type LeaveReminderCandidate = {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  isUnpaid: boolean;
  isReplacement: boolean;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
  carryForwardEnabled: boolean;
  carryForwardCutoff: string | null;
  asOfDate: string;
};

export type LeaveReminderPlan = {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  remainingDays: number;
  reason: LeaveReminderReason;
  daysUntilExpiry: number | null;
  idempotencyKey: string;
};

export function reminderMonthKey(asOfDate: string): string {
  return asOfDate.slice(0, 7);
}

export function leaveBalanceReminderKey(
  organizationId: string,
  employeeId: string,
  leaveTypeId: string,
  asOfDate: string,
): string {
  return `leave-balance-reminder:${organizationId}:${employeeId}:${leaveTypeId}:${reminderMonthKey(asOfDate)}`;
}

/**
 * Days from asOfDate until MM-DD in the same year.
 * Returns null when the cutoff has passed or is more than 30 days away.
 */
export function daysUntilCutoff(asOfDate: string, cutoffMMDD: string | null | undefined): number | null {
  if (!cutoffMMDD) return null;
  const match = /^(\d{2})-(\d{2})$/.exec(cutoffMMDD.trim());
  if (!match) return null;

  const year = Number(asOfDate.slice(0, 4));
  const month = Number(match[1]);
  const day = Number(match[2]);
  const asOfUtc = Date.parse(`${asOfDate}T00:00:00Z`);
  const cutoffUtc = Date.UTC(year, month - 1, day);
  if (Number.isNaN(asOfUtc)) return null;

  const diff = Math.round((cutoffUtc - asOfUtc) / 86_400_000);
  if (diff < 0 || diff > EXPIRY_WARNING_DAYS) return null;
  return diff;
}

export function planLeaveBalanceReminder(input: LeaveReminderCandidate): LeaveReminderPlan | null {
  if (input.isUnpaid || input.isReplacement) return null;
  if (input.entitlementDays <= 0 && input.carryForwardDays <= 0) return null;

  const remainingDays = Math.max(
    0,
    input.entitlementDays - input.usedDays - input.pendingDays,
  );
  const lowBalance = input.entitlementDays > 0 && remainingDays <= LOW_BALANCE_DAYS;
  const daysUntilExpiry =
    input.carryForwardEnabled && input.carryForwardDays > 0
      ? daysUntilCutoff(input.asOfDate, input.carryForwardCutoff)
      : null;
  const expiringSoon = daysUntilExpiry !== null;

  if (!lowBalance && !expiringSoon) return null;

  const reason: LeaveReminderReason =
    lowBalance && expiringSoon ? "low_and_expiring" : lowBalance ? "low_balance" : "expiring";

  return {
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    leaveTypeId: input.leaveTypeId,
    leaveTypeName: input.leaveTypeName,
    remainingDays,
    reason,
    daysUntilExpiry,
    idempotencyKey: leaveBalanceReminderKey(
      input.organizationId,
      input.employeeId,
      input.leaveTypeId,
      input.asOfDate,
    ),
  };
}

export function leaveBalanceReminderMessage(plan: LeaveReminderPlan): string {
  if (plan.reason === "low_balance") {
    return `${plan.leaveTypeName} balance is low: ${plan.remainingDays} day(s) remaining.`;
  }
  if (plan.reason === "expiring") {
    return `${plan.leaveTypeName} carry-forward leave expires in ${plan.daysUntilExpiry} day(s).`;
  }
  return `${plan.leaveTypeName} balance is low (${plan.remainingDays} day(s) left) and carry-forward leave expires in ${plan.daysUntilExpiry} day(s).`;
}

type AdminClient = ReturnType<typeof createAdminClient>;

type LeaveTypeRow = {
  id: string;
  organization_id: string;
  name: string;
  entitlement_days: number | null;
  is_unpaid: boolean | null;
  carry_forward_enabled: boolean | null;
  carry_forward_expiry_cutoff_date: string | null;
};

type EmployeeRow = {
  id: string;
  organization_id: string;
  annual_leave_entitlement: number | null;
  annual_leave_carry_forward: number | null;
};

type RequestRow = {
  employee_id: string;
  leave_type_id: string;
  days: number | null;
  status: string;
};

export type LeaveBalanceReminderResult = {
  remindedCount: number;
  skippedCount: number;
};

export async function performLeaveBalanceReminders(options?: {
  organizationId?: string;
  asOfDate?: string;
  dryRun?: boolean;
  client?: AdminClient;
}): Promise<LeaveBalanceReminderResult> {
  const admin = options?.client ?? createAdminClient();
  const asOfDate = options?.asOfDate ?? new Date().toISOString().slice(0, 10);

  let typesQuery = admin
    .from("leave_types")
    .select(
      "id, organization_id, name, entitlement_days, is_unpaid, carry_forward_enabled, carry_forward_expiry_cutoff_date",
    );
  if (options?.organizationId) {
    typesQuery = typesQuery.eq("organization_id", options.organizationId);
  }

  const { data: leaveTypes, error: typeError } = await typesQuery;
  if (typeError) throw new Error(typeError.message);
  if (!leaveTypes || leaveTypes.length === 0) {
    return { remindedCount: 0, skippedCount: 0 };
  }

  const orgIds = Array.from(new Set((leaveTypes as LeaveTypeRow[]).map((row) => row.organization_id)));

  const { data: employees, error: employeeError } = await admin
    .from("employees")
    .select("id, organization_id, annual_leave_entitlement, annual_leave_carry_forward")
    .in("organization_id", orgIds)
    .eq("status", "active");
  if (employeeError) throw new Error(employeeError.message);

  const { data: requests, error: requestError } = await admin
    .from("leave_requests")
    .select("employee_id, leave_type_id, days, status")
    .in("organization_id", orgIds)
    .in("status", ["pending", "approved"]);
  if (requestError) throw new Error(requestError.message);

  const requestRows = (requests ?? []) as RequestRow[];
  let remindedCount = 0;
  let skippedCount = 0;

  for (const employee of (employees ?? []) as EmployeeRow[]) {
    const orgTypes = (leaveTypes as LeaveTypeRow[]).filter(
      (type) => type.organization_id === employee.organization_id,
    );

    for (const leaveType of orgTypes) {
      const matching = requestRows.filter(
        (row) => row.employee_id === employee.id && row.leave_type_id === leaveType.id,
      );
      const usedDays = matching
        .filter((row) => row.status === "approved")
        .reduce((sum, row) => sum + Number(row.days ?? 0), 0);
      const pendingDays = matching
        .filter((row) => row.status === "pending")
        .reduce((sum, row) => sum + Number(row.days ?? 0), 0);

      const isAnnual = leaveType.name.trim().toLowerCase() === "annual leave";
      const carryForwardDays = Number(employee.annual_leave_carry_forward ?? 0);
      const entitlementDays = isAnnual
        ? Number(employee.annual_leave_entitlement ?? leaveType.entitlement_days ?? 0) + carryForwardDays
        : Number(leaveType.entitlement_days ?? 0);

      const plan = planLeaveBalanceReminder({
        organizationId: employee.organization_id,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        isUnpaid: Boolean(leaveType.is_unpaid),
        isReplacement: isReplacementLeaveType(leaveType.name),
        entitlementDays,
        usedDays,
        pendingDays,
        carryForwardDays: isAnnual ? carryForwardDays : 0,
        carryForwardEnabled: Boolean(leaveType.carry_forward_enabled) && isAnnual,
        carryForwardCutoff: leaveType.carry_forward_expiry_cutoff_date,
        asOfDate,
      });

      if (!plan) {
        skippedCount += 1;
        continue;
      }

      if (!options?.dryRun) {
        const recipientUserId = await resolveUserIdForEmployee(
          employee.organization_id,
          employee.id,
          admin,
        );
        await queueNotification({
          organizationId: employee.organization_id,
          recipientUserId,
          channel: "in_app",
          template: "leave.balance_reminder",
          payload: {
            title: "Leave balance reminder",
            message: leaveBalanceReminderMessage(plan),
            leaveTypeId: plan.leaveTypeId,
            leaveTypeName: plan.leaveTypeName,
            remainingDays: plan.remainingDays,
            reason: plan.reason,
            daysUntilExpiry: plan.daysUntilExpiry,
            href: "/employee/leave",
          },
          idempotencyKey: plan.idempotencyKey,
        });
      }

      remindedCount += 1;
    }
  }

  return { remindedCount, skippedCount };
}
