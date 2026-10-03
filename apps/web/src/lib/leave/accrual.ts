import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log-event";
import { queueNotification } from "@/lib/notifications/queue";
import { resolveUserIdForEmployee } from "@/lib/approvals/service";

export type MonthlyAccrualResult = {
  processedCount: number;
  skippedCount: number;
  totalAccruedDays: number;
  auditLogIds: string[];
};

export async function performMonthlyLeaveAccrual(options?: {
  organizationId?: string;
  asOfDate?: string;
  dryRun?: boolean;
  client?: ReturnType<typeof createAdminClient>;
}): Promise<MonthlyAccrualResult> {
  const admin = options?.client ?? createAdminClient();
  const effectiveDate = options?.asOfDate ?? new Date().toISOString().slice(0, 10);
  const yearMonth = effectiveDate.slice(0, 7); // 'YYYY-MM'

  // 1. Fetch leave types configured for monthly accrual
  let leaveTypesQuery = admin
    .from("leave_types")
    .select("id, organization_id, name, entitlement_days, monthly_accrual_rate, accrual_frequency")
    .eq("accrual_frequency", "monthly");

  if (options?.organizationId) {
    leaveTypesQuery = leaveTypesQuery.eq("organization_id", options.organizationId);
  }

  const { data: leaveTypes, error: ltError } = await leaveTypesQuery;
  if (ltError) throw new Error(ltError.message);

  if (!leaveTypes || leaveTypes.length === 0) {
    return { processedCount: 0, skippedCount: 0, totalAccruedDays: 0, auditLogIds: [] };
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
  let totalAccruedDays = 0;
  const auditLogIds: string[] = [];

  // 3. Process each organization's active employees
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
        const accrualAmount =
          Number(lt.monthly_accrual_rate) > 0
            ? Number(lt.monthly_accrual_rate)
            : Math.round((Number(lt.entitlement_days) / 12) * 100) / 100;

        if (accrualAmount <= 0) continue;

        const idempotencyKey = `monthly_accrual:${orgId}:${emp.id}:${lt.id}:${yearMonth}`;

        // Check if already accrued for this month
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

        const isAnnualLeave = lt.name.toLowerCase() === "annual leave";
        const currentEntitlement = isAnnualLeave
          ? Number(emp.annual_leave_entitlement ?? 0)
          : Number(lt.entitlement_days ?? 0);

        const newEntitlement = Math.round((currentEntitlement + accrualAmount) * 100) / 100;

        if (!options?.dryRun) {
          // If annual leave, update employee record entitlement
          if (isAnnualLeave) {
            await admin
              .from("employees")
              .update({
                annual_leave_entitlement: newEntitlement,
              })
              .eq("id", emp.id);
          }

          // Insert immutable audit log
          const { data: logEntry, error: logError } = await admin
            .from("leave_balance_audit_logs")
            .insert({
              organization_id: orgId,
              employee_id: emp.id,
              leave_type_id: lt.id,
              action_type: "monthly_accrual",
              previous_balance: currentEntitlement,
              delta_days: accrualAmount,
              new_balance: newEntitlement,
              effective_date: effectiveDate,
              reason: `Monthly automated leave accrual for ${yearMonth}`,
              idempotency_key: idempotencyKey,
            })
            .select("id")
            .single();

          if (logError) {
            console.error(`Failed to insert leave balance audit log:`, logError);
            continue;
          }

          if (logEntry) {
            auditLogIds.push(logEntry.id);
          }

          // Log general audit event
          await logAuditEvent({
            organizationId: orgId,
            actorUserId: null,
            action: "leave.accrued",
            resourceType: "leave_type",
            resourceId: lt.id,
            metadata: {
              employeeId: emp.id,
              leaveTypeName: lt.name,
              accrualAmount,
              newEntitlement,
              yearMonth,
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
                title: "Leave Accrual Credited",
                message: `Your monthly leave accrual of ${accrualAmount} day(s) for ${lt.name} has been credited.`,
                href: "/employee/leave",
              },
              idempotencyKey: `notif-accrual-${emp.id}-${lt.id}-${yearMonth}`,
            });
          }
        }

        processedCount += 1;
        totalAccruedDays = Math.round((totalAccruedDays + accrualAmount) * 100) / 100;
      }
    }
  }

  return {
    processedCount,
    skippedCount,
    totalAccruedDays,
    auditLogIds,
  };
}
