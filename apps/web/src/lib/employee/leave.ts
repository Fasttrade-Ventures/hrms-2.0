import type { LeaveRequestInput } from "@hrms/validation";
import { countWorkingDays } from "@hrms/domain";

import { submitForApproval } from "@/lib/approvals/service";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type LeaveTypeOption = {
  id: string;
  name: string;
  entitlementDays: number;
  isUnpaid: boolean;
  requiresAttachment: boolean;
};

export type LeaveRequestRow = {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  days: number;
  reason: string | null;
  status: string;
  createdAt: string;
  attachmentFileId?: string | null;
  attachmentFileName?: string | null;
  approvalRequestId?: string | null;
};

export type LeaveBalanceRow = {
  leaveTypeId: string;
  leaveTypeName: string;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
};

export async function requireEmployeeContext() {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;

  if (!employeeId) {
    throw new Error("No employee record linked to this account.");
  }

  return {
    session,
    employeeId,
    organizationId: getOrganizationId(),
  };
}

export async function listLeaveTypes(): Promise<LeaveTypeOption[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: allowedData } = await supabase
    .from("employee_allowed_leave_types")
    .select("leave_type_id")
    .eq("employee_id", employeeId);

  const allowedIds = (allowedData ?? []).map((row) => row.leave_type_id);

  const query = supabase
    .from("leave_types")
    .select("id, name, entitlement_days, is_unpaid, requires_attachment")
    .eq("organization_id", organizationId);

  if (allowedIds.length > 0) {
    query.in("id", allowedIds);
  }

  const { data, error } = await query.order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    entitlementDays: Number(row.entitlement_days),
    isUnpaid: row.is_unpaid,
    requiresAttachment: row.requires_attachment,
  }));
}

export async function listLeaveRequests(): Promise<LeaveRequestRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, half_day, days, reason, status, created_at, leave_types(name), approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    leaveTypeName: (row.leave_types as { name?: string } | null)?.name ?? "Leave",
    startDate: row.start_date,
    endDate: row.end_date,
    halfDay: row.half_day,
    days: Number(row.days),
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getLeaveRequest(requestId: string): Promise<LeaveRequestRow | null> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, start_date, end_date, half_day, days, reason, status, created_at, attachment_file_id, approval_request_id, leave_types(name), file_objects(file_name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const file = Array.isArray(data.file_objects) ? data.file_objects[0] : data.file_objects;

  return {
    id: data.id,
    leaveTypeName: (data.leave_types as { name?: string } | null)?.name ?? "Leave",
    startDate: data.start_date,
    endDate: data.end_date,
    halfDay: data.half_day,
    days: Number(data.days),
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    attachmentFileId: data.attachment_file_id,
    attachmentFileName: (file as { file_name?: string } | null)?.file_name ?? null,
    approvalRequestId: data.approval_request_id,
  };
}

export async function getLeaveBalances(): Promise<LeaveBalanceRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: allowedData } = await supabase
    .from("employee_allowed_leave_types")
    .select("leave_type_id")
    .eq("employee_id", employeeId);

  const allowedIds = (allowedData ?? []).map((row) => row.leave_type_id);

  const typesQuery = supabase
    .from("leave_types")
    .select("id, name, entitlement_days")
    .eq("organization_id", organizationId);

  if (allowedIds.length > 0) {
    typesQuery.in("id", allowedIds);
  }

  const [employeeResult, typesResult, requestsResult] = await Promise.all([
    supabase
      .from("employees")
      .select("annual_leave_entitlement, annual_leave_carry_forward")
      .eq("id", employeeId)
      .maybeSingle(),
    typesQuery,
    supabase
      .from("leave_requests")
      .select("leave_type_id, days, status")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .in("status", ["pending", "approved"]),
  ]);

  if (typesResult.error) throw new Error(typesResult.error.message);
  if (requestsResult.error) throw new Error(requestsResult.error.message);

  return (typesResult.data ?? []).map((type) => {
    const matching = (requestsResult.data ?? []).filter((row) => row.leave_type_id === type.id);
    const usedDays = matching
      .filter((row) => row.status === "approved")
      .reduce((sum, row) => sum + Number(row.days), 0);
    const pendingDays = matching
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + Number(row.days), 0);

    let entitlementDays = Number(type.entitlement_days);
    if (type.name.toLowerCase() === "annual leave" && employeeResult?.data) {
      entitlementDays = Number(employeeResult.data.annual_leave_entitlement ?? 14) +
                        Number(employeeResult.data.annual_leave_carry_forward ?? 0);
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

export function calculateLeaveDays(input: LeaveRequestInput): number {
  const start = new Date(`${input.startDate}T00:00:00`);
  const end = new Date(`${input.endDate}T00:00:00`);

  if (end < start) {
    throw new Error("End date must be on or after start date.");
  }

  return countWorkingDays(start, end, {
    weekendMode: "sat_sun",
    halfDay: input.halfDay,
  });
}

export async function createLeaveRequest(input: LeaveRequestInput): Promise<string> {
  const session = await requireAuth();
  const { employeeId, organizationId } = await requireEmployeeContext();
  const days = calculateLeaveDays(input);
  const supabase = await createClient();

  const { assertLeaveDatesAllowed } = await import("@/lib/leave/blackout");
  await assertLeaveDatesAllowed(organizationId, input.leaveTypeId, input.startDate, input.endDate);

  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("name")
    .eq("id", input.leaveTypeId)
    .maybeSingle();

  let attachmentFileName = null;
  if (input.attachmentFileId) {
    const { data: fileObj } = await supabase
      .from("file_objects")
      .select("file_name")
      .eq("id", input.attachmentFileId)
      .maybeSingle();
    attachmentFileName = fileObj?.file_name ?? null;
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      leave_type_id: input.leaveTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      half_day: input.halfDay,
      days,
      reason: input.reason ?? null,
      status: "draft",
      attachment_file_id: input.attachmentFileId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create leave request.");
  }

  await submitForApproval({
    organizationId,
    requesterEmployeeId: employeeId,
    requestType: "leave",
    sourceTable: "leave_requests",
    sourceId: data.id,
    actorUserId: session.user.id,
    payload: {
      leaveTypeName: leaveType?.name ?? "Leave",
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason ?? null,
      attachmentFileId: input.attachmentFileId ?? null,
      attachmentFileName,
    },
  });

  const { emitLeaveWebhook } = await import("@/lib/integrations/webhooks/emit");
  await emitLeaveWebhook(
    organizationId,
    "leave.submitted",
    { requestId: data.id, employeeId, days },
    `leave-submitted:${data.id}`,
  );

  return data.id;
}
