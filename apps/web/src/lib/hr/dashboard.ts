import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { firstNameFromFullName, getCurrentEmployeeDetail, greetingForHour } from "@/lib/employees/self";
import { getComplianceWatchRows } from "@/lib/hr/documents";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type HrActionQueueRow = {
  id: string;
  type: string;
  typeTone: "leave" | "claim" | "ot" | "late" | "neutral";
  employeeName: string;
  details: string;
  timeLabel: string;
  href: string;
};

export type HrComplianceRow = {
  id: string;
  dateLabel: string;
  title: string;
  subtitle: string;
};

export type HrDashboardData = {
  greeting: string;
  firstName: string;
  heroDescription: string;
  activeEmployees: number;
  branchCount: number;
  pendingRequests: number;
  docsExpiring: number;
  estimatedPayout: string;
  actionQueue: HrActionQueueRow[];
  workforce: {
    presentPct: number;
    onLeavePct: number;
    absentPct: number;
  };
  compliance: HrComplianceRow[];
  topbarSubtitle: string;
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const hours = Math.floor((now - then) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function requestTypeTone(type: string): HrActionQueueRow["typeTone"] {
  if (type === "leave") return "leave";
  if (type === "claim") return "claim";
  if (type === "overtime") return "ot";
  if (type === "late" || type === "attendance") return "late";
  return "neutral";
}

function requestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    leave: "Leave",
    claim: "Claim",
    overtime: "OT",
    late: "Late",
    attendance: "Late",
    replacement_credit: "Credit",
  };
  return labels[type] ?? type;
}

/** Review opens the employee record (or type-specific list when no employee). */
function actionReviewHref(requestType: string, employeeId?: string | null): string {
  if (employeeId) {
    return `/hr/employees/${employeeId}`;
  }
  if (requestType === "leave") return "/hr/apply-behalf?type=leave";
  if (requestType === "late" || requestType === "attendance") return "/hr/apply-behalf?type=late";
  if (requestType === "claim" || requestType === "overtime") return "/hr/employees";
  return "/hr/employees";
}

export async function getHrDashboardData(): Promise<HrDashboardData> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const employee = await getCurrentEmployeeDetail();
  const firstName = firstNameFromFullName(employee?.fullName, employee?.email);
  const hour = new Date().getHours();

  const today = new Date().toISOString().slice(0, 10);

  const [
    employeesRes,
    branchesRes,
    pendingRes,
    salariesRes,
    queueRes,
    attendanceRes,
    leaveTodayRes,
    complianceWatch,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    supabase
      .from("employees")
      .select("employee_profiles(basic_salary)")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("approval_requests")
      .select(
        "id, request_type, requester_employee_id, submitted_at, created_at, payload, employees!approval_requests_requester_employee_id_fkey(full_name, email)",
      )
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("work_date", today)
      .not("clock_in_at", "is", null),
    supabase
      .from("leave_requests")
      .select("employee_id")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
    getComplianceWatchRows(),
  ]);

  const liveEmployees = employeesRes.count ?? 0;
  const liveBranches = branchesRes.count ?? 0;
  const livePending = pendingRes.count ?? 0;
  const liveComplianceIssues = complianceWatch.issuesCount;

  const activeEmployees = liveEmployees;
  const branchCount = liveBranches;
  const pendingRequests = livePending;
  const docsExpiring = liveComplianceIssues;

  let payoutTotal = 0;
  for (const row of salariesRes.data ?? []) {
    const profile = Array.isArray(row.employee_profiles)
      ? row.employee_profiles[0]
      : row.employee_profiles;
    payoutTotal += Number((profile as { basic_salary?: string | number } | null)?.basic_salary ?? 0);
  }
  const estimatedPayout =
    payoutTotal > 0
      ? payoutTotal >= 1000
        ? `RM ${Math.round(payoutTotal / 1000)}k`
        : `RM ${Math.round(payoutTotal)}`
      : "RM 0";

  const onLeaveCount = new Set((leaveTodayRes.data ?? []).map((r) => r.employee_id)).size;
  const presentCount = attendanceRes.count ?? 0;
  const hasWorkforceSignal = presentCount > 0 || onLeaveCount > 0;
  const denom = Math.max(liveEmployees || activeEmployees, 1);
  const presentPct = hasWorkforceSignal ? Math.min(100, Math.round((presentCount / denom) * 100)) : 0;
  const onLeavePct = hasWorkforceSignal ? Math.min(100, Math.round((onLeaveCount / denom) * 100)) : 0;
  const absentPct = hasWorkforceSignal ? Math.max(0, 100 - presentPct - onLeavePct) : 0;

  const liveQueue: HrActionQueueRow[] = (queueRes.data ?? []).map((row) => {
    const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    const employeeName =
      (emp as { full_name?: string; email?: string } | null)?.full_name ??
      (emp as { email?: string } | null)?.email ??
      "Employee";
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const submittedAt = String(row.submitted_at ?? row.created_at ?? new Date().toISOString());
    const employeeId =
      typeof row.requester_employee_id === "string" ? row.requester_employee_id : null;

    return {
      id: row.id,
      type: requestTypeLabel(row.request_type),
      typeTone: requestTypeTone(row.request_type),
      employeeName,
      details: summarizeQueueDetails(row.request_type, payload),
      timeLabel: formatRelativeTime(submittedAt),
      href: actionReviewHref(row.request_type, employeeId),
    };
  });

  const actionQueue = liveQueue;
  const compliance = complianceWatch.rows;

  const heroDescription =
    livePending > 0 && liveComplianceIssues > 0
      ? `${pendingRequests} pending org requests, ${docsExpiring} document compliance issues, and payroll ready to review.`
      : livePending > 0
        ? `${pendingRequests} pending org requests need HR attention.`
        : liveComplianceIssues > 0
          ? `${docsExpiring} document compliance issues need follow-up.`
          : "Organization metrics are up to date. Review payroll and compliance when needed.";

  return {
    greeting: greetingForHour(hour),
    firstName: firstName || "there",
    heroDescription,
    activeEmployees,
    branchCount,
    pendingRequests,
    docsExpiring,
    estimatedPayout,
    actionQueue,
    workforce: { presentPct, onLeavePct, absentPct },
    compliance,
    topbarSubtitle: `Organization-wide · ${activeEmployees} employees · ${branchCount} branches`,
  };
}

function summarizeQueueDetails(type: string, payload: Record<string, unknown>): string {
  if (type === "leave") {
    return `${payload.leaveTypeName ?? "Leave"} · manager pending`;
  }
  if (type === "claim") {
    return `Claim · RM ${payload.amount ?? "0"}`;
  }
  if (type === "overtime") {
    return `OT · ${payload.hours ?? "0"}h`;
  }
  if (type === "late") {
    return `Late arrival · ${payload.requestDate ?? ""}`;
  }
  if (type === "attendance") {
    return `Manual attendance · ${payload.requestDate ?? ""}`;
  }
  return "Pending review";
}
