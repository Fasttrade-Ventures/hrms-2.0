import { createClient } from "@/lib/supabase/server";
import { requireEmployeeContext } from "@/lib/employee/leave";

export type TimelineStep = {
  label: string;
  approverName?: string;
  status: string;
  actedAt: string | null;
  comment: string | null;
};

export async function getApprovalTimeline(approvalRequestId: string): Promise<TimelineStep[]> {
  const supabase = await createClient();

  // Get the requester and submitted info
  const { data: request } = await supabase
    .from("approval_requests")
    .select(`
      created_at,
      status,
      requester_employee_id
    `)
    .eq("id", approvalRequestId)
    .maybeSingle();

  let requesterName = "Employee";
  if (request) {
    const { data: empRaw } = await supabase
      .from("employees")
      .select("full_name, email")
      .eq("id", request.requester_employee_id)
      .maybeSingle();
    requesterName = empRaw?.full_name ?? empRaw?.email ?? "Employee";
  }

  const timeline: TimelineStep[] = [
    {
      label: "Submitted",
      approverName: requesterName,
      status: "completed",
      actedAt: request?.created_at ?? null,
      comment: null,
    },
  ];

  const { data: steps, error: stepsError } = await supabase
    .from("approval_steps")
    .select(`
      id,
      step_order,
      status,
      acted_at,
      comment,
      approver_employee_id
    `)
    .eq("approval_request_id", approvalRequestId)
    .order("step_order", { ascending: true });

  if (stepsError) throw new Error(stepsError.message);

  for (const step of steps ?? []) {
    let approverName = "Manager";
    if (step.approver_employee_id) {
      const { data: empRaw } = await supabase
        .from("employees")
        .select("full_name, email")
        .eq("id", step.approver_employee_id)
        .maybeSingle();
      approverName = empRaw?.full_name ?? empRaw?.email ?? "Manager";
    }

    timeline.push({
      label: "Manager Review",
      approverName,
      status: step.status,
      actedAt: step.acted_at,
      comment: step.comment,
    });
  }

  // Add final step if approved/rejected
  if (request && (request.status === "approved" || request.status === "rejected")) {
    timeline.push({
      label: request.status === "approved" ? "Approved" : "Rejected",
      status: request.status,
      actedAt: timeline[timeline.length - 1]?.actedAt ?? null,
      comment: null,
    });
  }

  return timeline;
}

export async function listClaims() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select("id, amount, receipt_date, description, status, created_at, approval_request_id, claim_types(name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    receiptDate: row.receipt_date,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
    claimTypeName: (row.claim_types as { name?: string } | null)?.name ?? "Claim",
  }));
}

export async function getClaim(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claims")
    .select("id, amount, receipt_date, description, status, created_at, approval_request_id, claim_types(name)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    amount: Number(data.amount),
    receiptDate: data.receipt_date,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
    claimTypeName: (data.claim_types as { name?: string } | null)?.name ?? "Claim",
  };
}

export async function listOvertimeRequests() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("overtime_requests")
    .select("id, work_date, hours, rate_type, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    workDate: row.work_date,
    hours: Number(row.hours),
    rateType: row.rate_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getOvertimeRequest(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("overtime_requests")
    .select("id, work_date, hours, rate_type, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    workDate: data.work_date,
    hours: Number(data.hours),
    rateType: data.rate_type,
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
  };
}

export async function listLateReports() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("late_requests")
    .select("id, request_date, actual_arrival_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    requestDate: row.request_date,
    actualArrivalTime: row.actual_arrival_time,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getLateReport(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("late_requests")
    .select("id, request_date, actual_arrival_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    requestDate: data.request_date,
    actualArrivalTime: data.actual_arrival_time,
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
  };
}

export async function listAttendanceCorrections() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_requests")
    .select("id, request_date, clock_in_time, clock_out_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    requestDate: row.request_date,
    clockInTime: row.clock_in_time,
    clockOutTime: row.clock_out_time,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    approvalRequestId: row.approval_request_id,
  }));
}

export async function getAttendanceCorrection(id: string) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_requests")
    .select("id, request_date, clock_in_time, clock_out_time, reason, status, created_at, approval_request_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    requestDate: data.request_date,
    clockInTime: data.clock_in_time,
    clockOutTime: data.clock_out_time,
    reason: data.reason,
    status: data.status,
    createdAt: data.created_at,
    approvalRequestId: data.approval_request_id,
  };
}
