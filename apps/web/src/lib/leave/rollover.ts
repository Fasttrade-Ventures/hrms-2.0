import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log-event";
import { queueNotification } from "@/lib/notifications/queue";
import { resolveUserIdForEmployee } from "@/lib/approvals/service";

export type CarryForwardResult = {
  processedCount: number;
  skippedCount: number;
  totalCarriedDays: number;
  totalForfeitedDays: number;
  auditLogIds: string[];
};

export type ExpiryResult = {
  expiredCount: number;
  skippedCount: number;
  totalExpiredDays: number;
  auditLogIds: string[];
};

/**
 * Executes year-end carry-forward rollover:
 * Calculates remaining unused leave from concluding year, applies max_carry_forward_days cap,
 * sets new year carry-forward balance, forfeits excess days, and records immutable audit trail.
 */
export async function performYearEndCarryForward(options?: {
  targetYear?: number;
  organizationId?: string;
  dryRun?: boolean;
  client?: ReturnType<typeof createAdminClient>;
}): Promise<CarryForwardResult> {
  const admin = options?.client ?? createAdminClient();
  const currentYear = new Date().getFullYear();
  const targetYear = options?.targetYear ?? currentYear;
  const concludingYear = targetYear - 1;
  const concludingYearStart = `${concludingYear}-01-01`;
  const concludingYearEnd = `${concludingYear}-12-31`;

  // 1. Fetch leave types configured for carry-forward
  let leaveTypesQuery = admin
    .from("leave_types")
    .select("id, organization_id, name, entitlement_days, carry_forward_enabled, max_carry_forward_days, accrual_frequency")
    .eq("carry_forward_enabled", true);

  if (options?.organizationId) {
    leaveTypesQuery = leaveTypesQuery.eq("organization_id", options.organizationId);
  }

  const { data: leaveTypes, error: ltError } = await leaveTypesQuery;
  if (ltError) throw new Error(ltError.message);

  if (!leaveTypes || leaveTypes.length === 0) {
    return { processedCount: 0, skippedCount: 0, totalCarriedDays: 0, totalForfeitedDays: 0, auditLogIds: [] };
  }

  // 2. Group leave types by organization
  const orgMap = new Map<string, typeof leaveTypes>();
  for (const lt of leaveTypes) {
    const list = orgMap.get(lt.organization_id) ?? [];
    list.push(lt);
    orgMap.set(lt.organization_id, list);
  }

  let processedCount = 0;
  let skippedCount = 0;
  let totalCarriedDays = 0;
  let totalForfeitedDays = 0;
  const auditLogIds: string[] = [];

  for (const [orgId, orgLeaveTypes] of orgMap.entries()) {
    const { data: employees, error: empError } = await admin
      .from("employees")
      .select("id, annual_leave_entitlement, annual_leave_carry_forward, status")
      .eq("organization_id", orgId)
      .eq("status", "active");

    if (empError) throw new Error(empError.message);
    if (!employees || employees.length === 0) continue;

    for (const emp of employees) {
      for (const lt of orgLeaveTypes) {
        const idempotencyKey = `year_end_carry_forward:${orgId}:${emp.id}:${lt.id}:${targetYear}`;

        // Check idempotency
        const { data: existingLog } = await admin
          .from("leave_balance_audit_logs")
          .select("id")
          .eq("organization_id", orgId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existingLog) {
          skippedCount += 1;
          continue;
        }

        // Query used days in concluding year
        const { data: approvedRequests, error: reqError } = await admin
          .from("leave_requests")
          .select("days")
          .eq("organization_id", orgId)
          .eq("employee_id", emp.id)
          .eq("leave_type_id", lt.id)
          .eq("status", "approved")
          .gte("start_date", concludingYearStart)
          .lte("start_date", concludingYearEnd);

        if (reqError) {
          console.error(`Failed to query approved leave requests:`, reqError);
          continue;
        }

        const usedDays = (approvedRequests ?? []).reduce((sum, r) => sum + Number(r.days), 0);
        const isAnnualLeave = lt.name.toLowerCase() === "annual leave";

        const totalEntitlement = isAnnualLeave
          ? Number(emp.annual_leave_entitlement ?? 14) + Number(emp.annual_leave_carry_forward ?? 0)
          : Number(lt.entitlement_days ?? 0);

        const remainingUnused = Math.max(0, totalEntitlement - usedDays);
        const maxCap = Number(lt.max_carry_forward_days ?? 0);
        const carriedDays = Math.min(remainingUnused, maxCap);
        const forfeitedDays = Math.max(0, remainingUnused - carriedDays);

        if (!options?.dryRun) {
          // Update employee record with carried forward days and reset base entitlement for new year
          if (isAnnualLeave) {
            const baseEntitlement =
              lt.accrual_frequency === "monthly" ? 0 : Number(lt.entitlement_days ?? 14);

            await admin
              .from("employees")
              .update({
                annual_leave_carry_forward: carriedDays,
                annual_leave_entitlement: baseEntitlement,
              })
              .eq("id", emp.id);
          }

          // 1. Log carry forward audit entry
          const { data: cfLog, error: cfError } = await admin
            .from("leave_balance_audit_logs")
            .insert({
              organization_id: orgId,
              employee_id: emp.id,
              leave_type_id: lt.id,
              action_type: "year_end_carry_forward",
              previous_balance: remainingUnused,
              delta_days: carriedDays,
              new_balance: carriedDays,
              effective_date: `${targetYear}-01-01`,
              reason: `Year-end leave carry-forward from ${concludingYear} to ${targetYear} (capped at ${maxCap} days)`,
              idempotency_key: idempotencyKey,
            })
            .select("id")
            .single();

          if (!cfError && cfLog) {
            auditLogIds.push(cfLog.id);
          }

          // 2. Log forfeited audit entry if any
          if (forfeitedDays > 0) {
            const { data: fLog } = await admin
              .from("leave_balance_audit_logs")
              .insert({
                organization_id: orgId,
                employee_id: emp.id,
                leave_type_id: lt.id,
                action_type: "carry_forward_forfeited",
                previous_balance: remainingUnused,
                delta_days: -forfeitedDays,
                new_balance: carriedDays,
                effective_date: `${targetYear}-01-01`,
                reason: `Unused leave exceeding maximum carry-forward cap of ${maxCap} days forfeited`,
                idempotency_key: `carry_forward_forfeited:${orgId}:${emp.id}:${lt.id}:${targetYear}`,
              })
              .select("id")
              .single();

            if (fLog) {
              auditLogIds.push(fLog.id);
            }
          }

          // Log general audit event
          await logAuditEvent({
            organizationId: orgId,
            actorUserId: null,
            action: "leave.carried_forward",
            resourceType: "leave_type",
            resourceId: lt.id,
            metadata: {
              employeeId: emp.id,
              targetYear,
              carriedDays,
              forfeitedDays,
            },
          });

          // In-app notification to employee
          const employeeUserId = await resolveUserIdForEmployee(orgId, emp.id);
          if (employeeUserId) {
            await queueNotification({
              organizationId: orgId,
              recipientUserId: employeeUserId,
              channel: "in_app",
              template: "announcement.new",
              payload: {
                title: `${targetYear} Leave Carry-Forward Processed`,
                message: `Your ${lt.name} carry-forward has been processed: ${carriedDays} day(s) carried over${
                  forfeitedDays > 0 ? `, ${forfeitedDays} day(s) forfeited due to policy cap` : ""
                }.`,
                href: "/employee/leave",
              },
              idempotencyKey: `notif-cf-${emp.id}-${lt.id}-${targetYear}`,
            });
          }
        }

        processedCount += 1;
        totalCarriedDays = Math.round((totalCarriedDays + carriedDays) * 100) / 100;
        totalForfeitedDays = Math.round((totalForfeitedDays + forfeitedDays) * 100) / 100;
      }
    }
  }

  return {
    processedCount,
    skippedCount,
    totalCarriedDays,
    totalForfeitedDays,
    auditLogIds,
  };
}

/**
 * Sweeps and expires unutilized carry-forward leave once the configured cutoff date
 * (e.g. June 30th) has been reached.
 */
export async function performCarryForwardExpiry(options?: {
  asOfDate?: string;
  organizationId?: string;
  dryRun?: boolean;
  client?: ReturnType<typeof createAdminClient>;
}): Promise<ExpiryResult> {
  const admin = options?.client ?? createAdminClient();
  const effectiveDate = options?.asOfDate ?? new Date().toISOString().slice(0, 10);
  const currentYear = effectiveDate.slice(0, 4);
  const currentMMDD = effectiveDate.slice(5, 10); // 'MM-DD'

  // 1. Fetch leave types configured with carry-forward
  let leaveTypesQuery = admin
    .from("leave_types")
    .select("id, organization_id, name, carry_forward_enabled, carry_forward_expiry_cutoff_date")
    .eq("carry_forward_enabled", true);

  if (options?.organizationId) {
    leaveTypesQuery = leaveTypesQuery.eq("organization_id", options.organizationId);
  }

  const { data: leaveTypes, error: ltError } = await leaveTypesQuery;
  if (ltError) throw new Error(ltError.message);

  if (!leaveTypes || leaveTypes.length === 0) {
    return { expiredCount: 0, skippedCount: 0, totalExpiredDays: 0, auditLogIds: [] };
  }

  // Filter leave types whose cutoff date is reached
  const eligibleLeaveTypes = leaveTypes.filter((lt) => {
    const cutoff = lt.carry_forward_expiry_cutoff_date || "06-30";
    return currentMMDD >= cutoff;
  });

  if (eligibleLeaveTypes.length === 0) {
    return { expiredCount: 0, skippedCount: 0, totalExpiredDays: 0, auditLogIds: [] };
  }

  let expiredCount = 0;
  let skippedCount = 0;
  let totalExpiredDays = 0;
  const auditLogIds: string[] = [];

  for (const lt of eligibleLeaveTypes) {
    const { data: employees, error: empError } = await admin
      .from("employees")
      .select("id, annual_leave_carry_forward, status")
      .eq("organization_id", lt.organization_id)
      .eq("status", "active")
      .gt("annual_leave_carry_forward", 0);

    if (empError) {
      console.error(`Failed to fetch employees with carry forward balance:`, empError);
      continue;
    }

    for (const emp of employees ?? []) {
      const expiredDays = Number(emp.annual_leave_carry_forward ?? 0);
      if (expiredDays <= 0) continue;

      const idempotencyKey = `carry_forward_expiry:${lt.organization_id}:${emp.id}:${lt.id}:${currentYear}`;

      // Check idempotency
      const { data: existingLog } = await admin
        .from("leave_balance_audit_logs")
        .select("id")
        .eq("organization_id", lt.organization_id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingLog) {
        skippedCount += 1;
        continue;
      }

      if (!options?.dryRun) {
        // Zero out expired carry-forward balance
        await admin
          .from("employees")
          .update({
            annual_leave_carry_forward: 0,
          })
          .eq("id", emp.id);

        // Insert audit log
        const { data: expLog, error: expError } = await admin
          .from("leave_balance_audit_logs")
          .insert({
            organization_id: lt.organization_id,
            employee_id: emp.id,
            leave_type_id: lt.id,
            action_type: "carry_forward_expiry",
            previous_balance: expiredDays,
            delta_days: -expiredDays,
            new_balance: 0,
            effective_date: effectiveDate,
            reason: `Carry-forward leave expired after cutoff date (${lt.carry_forward_expiry_cutoff_date || "06-30"})`,
            idempotency_key: idempotencyKey,
          })
          .select("id")
          .single();

        if (!expError && expLog) {
          auditLogIds.push(expLog.id);
        }

        // Log general audit event
        await logAuditEvent({
          organizationId: lt.organization_id,
          actorUserId: null,
          action: "leave.expired",
          resourceType: "leave_type",
          resourceId: lt.id,
          metadata: {
            employeeId: emp.id,
            expiredDays,
            cutoffDate: lt.carry_forward_expiry_cutoff_date || "06-30",
          },
        });

        // Notify employee
        const employeeUserId = await resolveUserIdForEmployee(lt.organization_id, emp.id);
        if (employeeUserId) {
          await queueNotification({
            organizationId: lt.organization_id,
            recipientUserId: employeeUserId,
            channel: "in_app",
            template: "announcement.new",
            payload: {
              title: "Carry-Forward Leave Expired",
              message: `Your remaining carry-forward balance of ${expiredDays} day(s) for ${lt.name} has expired as of the cutoff date.`,
              href: "/employee/leave",
            },
            idempotencyKey: `notif-expiry-${emp.id}-${lt.id}-${currentYear}`,
          });
        }
      }

      expiredCount += 1;
      totalExpiredDays = Math.round((totalExpiredDays + expiredDays) * 100) / 100;
    }
  }

  return {
    expiredCount,
    skippedCount,
    totalExpiredDays,
    auditLogIds,
  };
}
