import { createClient } from "@/lib/supabase/server";

export type BranchDashboardData = {
  employeeCount: number;
  presentToday: number;
  onLeaveToday: number;
  complianceGaps: number;
  pendingApprovals: number;
};

export async function getBranchDashboardData(
  organizationId: string,
  branchId: string,
): Promise<BranchDashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [employeesRes, attendanceRes, leaveRes, pendingRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .eq("status", "active"),
    supabase
      .from("attendance_records")
      .select("employee_id, employees!inner(branch_id)", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("work_date", today)
      .not("clock_in_at", "is", null)
      .eq("employees.branch_id", branchId),
    supabase
      .from("leave_requests")
      .select("employee_id, employees!inner(branch_id)")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .eq("employees.branch_id", branchId),
    supabase
      .from("approval_requests")
      .select("id, requester_employee_id, employees!approval_requests_requester_employee_id_fkey(branch_id)", {
        count: "exact",
        head: true,
      })
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .eq("employees.branch_id", branchId),
  ]);

  const employeeCount = employeesRes.count ?? 0;
  const presentToday = attendanceRes.count ?? 0;
  const onLeaveToday = new Set((leaveRes.data ?? []).map((row) => row.employee_id)).size;

  const { data: branchEmployees } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("branch_id", branchId)
    .eq("status", "active");

  const employeeIds = (branchEmployees ?? []).map((row) => row.id);
  let complianceGaps = 0;

  if (employeeIds.length > 0) {
    const { data: requiredDocs } = await supabase
      .from("required_documents")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    const { data: uploaded } = await supabase
      .from("employee_documents")
      .select("employee_id, document_type")
      .eq("organization_id", organizationId)
      .in("employee_id", employeeIds);

    const uploadedSet = new Set(
      (uploaded ?? []).map((row) => `${row.employee_id}:${String(row.document_type).toLowerCase()}`),
    );

    for (const employeeId of employeeIds) {
      for (const doc of requiredDocs ?? []) {
        if (!uploadedSet.has(`${employeeId}:${doc.name.toLowerCase()}`)) {
          complianceGaps += 1;
        }
      }
    }
  }

  return {
    employeeCount,
    presentToday,
    onLeaveToday,
    complianceGaps,
    pendingApprovals: pendingRes.count ?? 0,
  };
}
