import { transition } from "@hrms/domain";
import { createDbEntitlementProvider, type ModuleKey, type ProductTier } from "@hrms/platform";
import { leaveRequestSchema } from "@hrms/validation";

import { parseAttendanceTarget, type AttendanceTarget } from "@/lib/api/attendance";
import { resolveUserIdForEmployee, submitForApproval } from "@/lib/approvals/service";
import { logAuditEvent } from "@/lib/audit/log-event";
import { requireActiveSubscription } from "@/lib/billing/subscription-gate";
import { calculateLeaveDays } from "@/lib/employee/leave";
import { expireOverduePendingLeaves } from "@/lib/leave/expiry";
import {
  getReplacementCreditBalance,
  isReplacementLeaveType,
  restoreReplacementCredits,
} from "@/lib/leave/replacement-credit";
import { queueNotification } from "@/lib/notifications/queue";
import { createAdminClient } from "@/lib/supabase/admin";

const OT_RATES = new Set(["1.5", "2.0", "3.0"]);

function normalizeOtRate(value?: string): string {
  const raw = (value ?? "1.5").trim();
  const mapped = raw === "2" ? "2.0" : raw === "3" ? "3.0" : raw;
  if (!OT_RATES.has(mapped)) throw new Error("rateType must be 1.5, 2.0, or 3.0.");
  return mapped;
}

function requireDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be YYYY-MM-DD.`);
  return value;
}

export function staffApiErrorStatus(message: string): number {
  if (
    message === "Active employee not found." ||
    message === "Leave request not found." ||
    message === "Claim type not found."
  ) {
    return 404;
  }
  if (message.startsWith("Only a pending") || message.includes("already have an active leave")) {
    return 409;
  }
  if (message.startsWith("Subscription inactive") || message.includes("is not enabled")) {
    return 403;
  }
  return 400;
}

async function findEmployee(organizationId: string, target: AttendanceTarget) {
  const parsed = parseAttendanceTarget(target);
  const admin = createAdminClient();
  let query = admin
    .from("employees")
    .select("id, employee_number, full_name, email")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  query = parsed.employeeNumber
    ? query.eq("employee_number", parsed.employeeNumber)
    : query.eq("email", parsed.email!);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Active employee not found.");
  return data;
}

async function requireEmployeeActor(organizationId: string, employeeId: string): Promise<string> {
  const actor = await resolveUserIdForEmployee(organizationId, employeeId);
  if (!actor) throw new Error("Employee has no login, so the request cannot be submitted.");
  return actor;
}

async function requireModule(organizationId: string, module: ModuleKey): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("product_tier, module_flags")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Organization not found.");
  const tier = (data.product_tier ?? "core") as ProductTier;
  const entitlements = createDbEntitlementProvider({
    tier: tier === "professional" || tier === "enterprise" ? tier : "core",
    modules: (data.module_flags ?? {}) as Partial<Record<ModuleKey, boolean>>,
  });
  if (!entitlements.hasModule(module)) {
    throw new Error(`${module} is not enabled for this organization.`);
  }
}

export async function applyLeaveFromApi(
  organizationId: string,
  input: AttendanceTarget & {
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    halfDay?: boolean;
    reason?: string;
  },
) {
  await requireActiveSubscription(organizationId);
  const parsed = leaveRequestSchema.safeParse({
    leaveTypeId: input.leaveTypeId,
    startDate: input.startDate,
    endDate: input.endDate,
    halfDay: Boolean(input.halfDay),
    reason: input.reason,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid leave request.");
  }

  const employee = await findEmployee(organizationId, input);
  const actor = await requireEmployeeActor(organizationId, employee.id);
  const admin = createAdminClient();

  const { assertLeaveTypeAllowed } = await import("@/lib/leave/allowlist");
  await assertLeaveTypeAllowed({
    organizationId,
    employeeId: employee.id,
    leaveTypeId: parsed.data.leaveTypeId,
    client: admin,
  });
  const { assertNoOverlappingLeave } = await import("@/lib/leave/overlap");
  await assertNoOverlappingLeave({
    organizationId,
    employeeId: employee.id,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    client: admin,
  });

  const { data: holidayRows, error: holidayError } = await admin
    .from("holidays")
    .select("holiday_date")
    .eq("organization_id", organizationId);
  if (holidayError) throw new Error(holidayError.message);
  const days = calculateLeaveDays(parsed.data, {
    holidays: (holidayRows ?? []).map((row) => row.holiday_date as string),
  });

  const { assertLeaveDatesAllowed } = await import("@/lib/leave/blackout");
  await assertLeaveDatesAllowed(
    organizationId,
    parsed.data.leaveTypeId,
    parsed.data.startDate,
    parsed.data.endDate,
    admin,
  );
  const { assertLeaveBalance } = await import("@/lib/leave/balance");
  await assertLeaveBalance({
    organizationId,
    employeeId: employee.id,
    leaveTypeId: parsed.data.leaveTypeId,
    days,
    client: admin,
  });

  const { data: leaveType } = await admin
    .from("leave_types")
    .select("name")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.leaveTypeId)
    .maybeSingle();

  const { data, error } = await admin
    .from("leave_requests")
    .insert({
      organization_id: organizationId,
      employee_id: employee.id,
      leave_type_id: parsed.data.leaveTypeId,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      half_day: parsed.data.halfDay,
      days,
      reason: parsed.data.reason ?? null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create leave request.");

  try {
    if (isReplacementLeaveType(leaveType?.name)) {
      const { consumeReplacementCredits } = await import("@/lib/leave/replacement-credit");
      await consumeReplacementCredits({
        organizationId,
        employeeId: employee.id,
        leaveRequestId: data.id,
        days,
        actorUserId: actor,
        client: admin,
      });
    }

    await submitForApproval({
      organizationId,
      requesterEmployeeId: employee.id,
      requestType: "leave",
      sourceTable: "leave_requests",
      sourceId: data.id,
      actorUserId: actor,
      client: admin,
      payload: {
        leaveTypeName: leaveType?.name ?? "Leave",
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        days,
        reason: parsed.data.reason ?? null,
      },
    });
  } catch (err) {
    if (isReplacementLeaveType(leaveType?.name)) {
      await restoreReplacementCredits({
        organizationId,
        leaveRequestId: data.id,
        actorUserId: actor,
        client: admin,
      }).catch(() => undefined);
    }
    await admin.from("leave_requests").delete().eq("id", data.id).eq("organization_id", organizationId);
    throw err;
  }

  const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
  await emitLeaveWebhook(
    organizationId,
    "leave.submitted",
    { requestId: data.id, employeeId: employee.id, days },
    `leave-submitted:${data.id}`,
  );

  return { id: data.id, employeeId: employee.id, days, status: "pending" };
}

export async function cancelLeaveFromApi(organizationId: string, requestId: string, reason?: string) {
  await requireActiveSubscription(organizationId);
  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from("leave_requests")
    .select("id, status, approval_request_id, days, employee_id")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!request) throw new Error("Leave request not found.");
  if (request.status !== "pending" && request.status !== "draft") {
    throw new Error("Only a pending leave request can be cancelled.");
  }

  const nextStatus = transition(request.status as "pending" | "draft", "cancel");
  const now = new Date().toISOString();
  const actor = await resolveUserIdForEmployee(organizationId, request.employee_id as string);

  const { error: updateError } = await admin
    .from("leave_requests")
    .update({ status: nextStatus, updated_at: now })
    .eq("id", requestId)
    .eq("organization_id", organizationId);
  if (updateError) throw new Error(updateError.message);

  if (actor) {
    await restoreReplacementCredits({
      organizationId,
      leaveRequestId: requestId,
      actorUserId: actor,
      client: admin,
    });
  }

  let approverEmployeeId: string | null = null;
  if (request.approval_request_id) {
    const { data: appReq } = await admin
      .from("approval_requests")
      .select("id, payload")
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    await admin
      .from("approval_requests")
      .update({
        status: nextStatus,
        resolved_at: now,
        payload: {
          ...(typeof appReq?.payload === "object" && appReq?.payload !== null ? appReq.payload : {}),
          cancellationReason: reason ?? null,
          cancelledByUserId: actor,
          cancelledAt: now,
        },
      })
      .eq("id", request.approval_request_id)
      .eq("organization_id", organizationId);

    const { data: pendingStep } = await admin
      .from("approval_steps")
      .select("id, approver_employee_id")
      .eq("approval_request_id", request.approval_request_id)
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingStep) {
      approverEmployeeId = pendingStep.approver_employee_id;
      await admin
        .from("approval_steps")
        .update({
          status: nextStatus,
          acted_at: now,
          comment: reason ? `Cancelled by employee: ${reason}` : "Cancelled by employee",
        })
        .eq("id", pendingStep.id);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: actor,
    action: "leave.cancelled",
    resourceType: "leave",
    resourceId: requestId,
    metadata: { reason: reason ?? null, days: request.days, source: "api" },
  });

  if (approverEmployeeId) {
    const managerUserId = await resolveUserIdForEmployee(organizationId, approverEmployeeId);
    const { data: employee } = await admin
      .from("employees")
      .select("full_name")
      .eq("id", request.employee_id)
      .maybeSingle();
    await queueNotification({
      organizationId,
      recipientUserId: managerUserId,
      channel: "in_app",
      template: "approval.cancel",
      payload: {
        requestId: request.approval_request_id,
        requestType: "leave",
        sourceId: requestId,
        actorName: employee?.full_name || "Employee",
        reason: reason ?? null,
        href: `/employee/leave/${requestId}`,
      },
      idempotencyKey: `leave-cancelled-${requestId}`,
    });
  }

  const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
  await emitLeaveWebhook(
    organizationId,
    "leave.cancelled",
    { requestId, employeeId: request.employee_id, days: request.days, reason: reason ?? null },
    `leave-cancelled:${requestId}`,
  );

  return { id: requestId, status: nextStatus };
}

export async function submitClaimFromApi(
  organizationId: string,
  input: AttendanceTarget & {
    claimTypeId?: string;
    amount?: number | string;
    receiptDate?: string;
    description?: string;
    distanceKm?: number;
    origin?: string;
    destination?: string;
  },
) {
  await requireModule(organizationId, "claims");
  if (!input.claimTypeId || !input.receiptDate) {
    throw new Error("claimTypeId and receiptDate are required.");
  }
  requireDate(input.receiptDate, "receiptDate");
  const employee = await findEmployee(organizationId, input);
  const actor = await requireEmployeeActor(organizationId, employee.id);
  const admin = createAdminClient();
  const { data: claimType, error: typeError } = await admin
    .from("claim_types")
    .select("id, name, max_amount, is_mileage, rate_per_km")
    .eq("id", input.claimTypeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (typeError) throw new Error(typeError.message);
  if (!claimType) throw new Error("Claim type not found.");

  const isMileage = Boolean(claimType.is_mileage);
  let amount = Number(input.amount ?? 0);
  let distanceKm: number | null = null;
  let ratePerKm: number | null = null;
  let origin: string | null = null;
  let destination: string | null = null;
  if (isMileage) {
    distanceKm = Number(input.distanceKm ?? 0);
    if (!distanceKm || distanceKm <= 0) throw new Error("distanceKm is required for a mileage claim.");
    origin = input.origin?.trim() || null;
    destination = input.destination?.trim() || null;
    if (!origin || !destination) throw new Error("origin and destination are required for a mileage claim.");
    ratePerKm = claimType.rate_per_km != null ? Number(claimType.rate_per_km) : 0;
    if (!ratePerKm) throw new Error("This mileage claim type has no rate per km.");
    amount = Number((distanceKm * ratePerKm).toFixed(2));
  }
  if (!amount || amount <= 0) throw new Error("amount is required.");
  if (claimType.max_amount != null && amount > Number(claimType.max_amount)) {
    throw new Error(`Amount exceeds the maximum of RM ${Number(claimType.max_amount).toFixed(2)}.`);
  }

  const { data, error } = await admin
    .from("claims")
    .insert({
      organization_id: organizationId,
      employee_id: employee.id,
      claim_type_id: input.claimTypeId,
      amount: amount.toFixed(2),
      receipt_date: input.receiptDate,
      description: input.description ?? null,
      is_mileage: isMileage,
      distance_km: distanceKm,
      rate_per_km: ratePerKm,
      origin,
      destination,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to submit claim.");

  try {
    await submitForApproval({
      organizationId,
      requesterEmployeeId: employee.id,
      requestType: "claim",
      sourceTable: "claims",
      sourceId: data.id,
      actorUserId: actor,
      client: admin,
      payload: {
        claimTypeName: claimType.name,
        amount: amount.toFixed(2),
        receiptDate: input.receiptDate,
        isMileage,
        ...(isMileage ? { origin, destination, distanceKm, ratePerKm } : {}),
      },
    });
  } catch (err) {
    await admin.from("claims").delete().eq("id", data.id).eq("organization_id", organizationId);
    throw err;
  }
  return { id: data.id, amount: amount.toFixed(2), status: "pending" };
}

export async function submitOvertimeFromApi(
  organizationId: string,
  input: AttendanceTarget & { workDate?: string; hours?: number; rateType?: string; reason?: string },
) {
  await requireModule(organizationId, "ot");
  if (!input.workDate || input.hours == null) throw new Error("workDate and hours are required.");
  requireDate(input.workDate, "workDate");
  const hours = Number(input.hours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error("hours must be greater than 0 and no more than 24.");
  }
  const rateType = normalizeOtRate(input.rateType);
  const employee = await findEmployee(organizationId, input);
  const actor = await requireEmployeeActor(organizationId, employee.id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("overtime_requests")
    .insert({
      organization_id: organizationId,
      employee_id: employee.id,
      work_date: input.workDate,
      hours,
      rate_type: rateType,
      reason: input.reason ?? null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to submit overtime.");
  try {
    await submitForApproval({
      organizationId,
      requesterEmployeeId: employee.id,
      requestType: "overtime",
      sourceTable: "overtime_requests",
      sourceId: data.id,
      actorUserId: actor,
      client: admin,
      payload: { workDate: input.workDate, hours, rateType, reason: input.reason ?? null },
    });
  } catch (err) {
    await admin.from("overtime_requests").delete().eq("id", data.id).eq("organization_id", organizationId);
    throw err;
  }
  return { id: data.id, status: "pending" };
}

export async function submitManualAttendanceFromApi(
  organizationId: string,
  input: AttendanceTarget & {
    requestDate?: string;
    clockInTime?: string;
    clockOutTime?: string;
    reason?: string;
  },
) {
  if (!input.requestDate) throw new Error("requestDate is required.");
  requireDate(input.requestDate, "requestDate");
  const employee = await findEmployee(organizationId, input);
  const actor = await requireEmployeeActor(organizationId, employee.id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attendance_requests")
    .insert({
      organization_id: organizationId,
      employee_id: employee.id,
      request_date: input.requestDate,
      clock_in_time: input.clockInTime || null,
      clock_out_time: input.clockOutTime || null,
      reason: input.reason ?? null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to submit manual attendance.");
  try {
    await submitForApproval({
      organizationId,
      requesterEmployeeId: employee.id,
      requestType: "attendance",
      sourceTable: "attendance_requests",
      sourceId: data.id,
      actorUserId: actor,
      client: admin,
      payload: {
        requestDate: input.requestDate,
        clockInTime: input.clockInTime || null,
        clockOutTime: input.clockOutTime || null,
        reason: input.reason ?? null,
      },
    });
  } catch (err) {
    await admin.from("attendance_requests").delete().eq("id", data.id).eq("organization_id", organizationId);
    throw err;
  }
  return { id: data.id, status: "pending" };
}

export async function leaveBalancesFromApi(organizationId: string, target: AttendanceTarget) {
  const employee = await findEmployee(organizationId, target);
  await expireOverduePendingLeaves({ organizationId, employeeId: employee.id }).catch(() => undefined);
  const admin = createAdminClient();

  const { data: allowedData, error: allowedError } = await admin
    .from("employee_allowed_leave_types")
    .select("leave_type_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employee.id);
  if (allowedError) throw new Error(allowedError.message);
  const allowedIds = (allowedData ?? []).map((row) => row.leave_type_id as string);

  const { data: repRows, error: repError } = await admin
    .from("leave_types")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", "%replacement%");
  if (repError) throw new Error(repError.message);
  const repIds = (repRows ?? []).map((row) => row.id as string);

  let typesQuery = admin
    .from("leave_types")
    .select("id, name, entitlement_days")
    .eq("organization_id", organizationId);
  if (allowedIds.length > 0) {
    typesQuery = typesQuery.in("id", Array.from(new Set([...allowedIds, ...repIds])));
  }
  const { data: types, error } = await typesQuery;
  if (error) throw new Error(error.message);

  const { data: requests, error: requestError } = await admin
    .from("leave_requests")
    .select("leave_type_id, days, status")
    .eq("organization_id", organizationId)
    .eq("employee_id", employee.id)
    .in("status", ["pending", "approved"]);
  if (requestError) throw new Error(requestError.message);

  const { data: profile } = await admin
    .from("employees")
    .select("annual_leave_entitlement, annual_leave_carry_forward")
    .eq("id", employee.id)
    .maybeSingle();

  const hasReplacement = (types ?? []).some((type) => isReplacementLeaveType(type.name));
  const repBal = hasReplacement
    ? await getReplacementCreditBalance(organizationId, employee.id, admin)
    : null;

  return (types ?? []).map((type) => {
    if (isReplacementLeaveType(type.name) && repBal) {
      return {
        leaveTypeId: type.id,
        leaveTypeName: type.name,
        entitlementDays: repBal.totalApprovedCredits,
        usedDays: repBal.usedDays,
        pendingDays: repBal.pendingDays,
        remainingDays: repBal.remainingDays,
      };
    }
    const matching = (requests ?? []).filter((row) => row.leave_type_id === type.id);
    const usedDays = matching.filter((row) => row.status === "approved").reduce((sum, row) => sum + Number(row.days), 0);
    const pendingDays = matching.filter((row) => row.status === "pending").reduce((sum, row) => sum + Number(row.days), 0);
    let entitlementDays = Number(type.entitlement_days);
    if (String(type.name).toLowerCase() === "annual leave" && profile) {
      entitlementDays =
        Number(profile.annual_leave_entitlement ?? 14) + Number(profile.annual_leave_carry_forward ?? 0);
    }
    return {
      leaveTypeId: type.id,
      leaveTypeName: type.name,
      entitlementDays,
      usedDays,
      pendingDays,
      remainingDays: Math.max(0, entitlementDays - usedDays - pendingDays),
    };
  });
}

export async function payslipsFromApi(organizationId: string, target: AttendanceTarget) {
  await requireModule(organizationId, "payroll");
  const employee = await findEmployee(organizationId, target);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payroll_payrun_items")
    .select("id, gross_pay, net_pay, epf_employee, socso_employee, eis_employee, pcb, payroll_payruns!inner(period_year, period_month, status, locked_at)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employee.id)
    .eq("payroll_payruns.status", "locked")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const payrun = (Array.isArray(row.payroll_payruns) ? row.payroll_payruns[0] : row.payroll_payruns) as {
      period_year?: number;
      period_month?: number;
      status?: string;
      locked_at?: string | null;
    } | null;
    if (!payrun || payrun.status !== "locked") return [];
    const periodYear = payrun.period_year ?? 0;
    const periodMonth = payrun.period_month ?? 0;
    return [{
      id: row.id,
      periodYear,
      periodMonth,
      periodLabel: new Date(periodYear, periodMonth - 1, 1).toLocaleDateString("en-MY", {
        month: "long",
        year: "numeric",
      }),
      grossPay: Number(row.gross_pay),
      netPay: Number(row.net_pay),
      epfEmployee: Number(row.epf_employee),
      socsoEmployee: Number(row.socso_employee),
      eisEmployee: Number(row.eis_employee),
      pcb: Number(row.pcb),
      lockedAt: payrun.locked_at ?? null,
    }];
  });
}
