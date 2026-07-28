import { requireManagerContext } from "@/lib/manager/context";
import { getAppraisalDetail, assertAppraisalEditable } from "@/lib/performance/appraisals";
import { logAuditEvent } from "@/lib/audit/log-event";
import type { AppraisalStatus } from "@/lib/performance/types";
import { parseRating } from "@/lib/performance/types";
import { createClient } from "@/lib/supabase/server";

export type TeamPerformanceRow = {
  id: string;
  employeeName: string;
  cycleName: string;
  status: AppraisalStatus;
  selfRating: number | null;
  managerRating: number | null;
  canReview: boolean;
};

export async function listTeamPerformance(): Promise<TeamPerformanceRow[]> {
  const { employeeId, organizationId } = await requireManagerContext();
  const supabase = await createClient();

  const { data: reports, error: reportsError } = await supabase
    .from("employees")
    .select("id, full_name, email")
    .eq("organization_id", organizationId)
    .eq("manager_employee_id", employeeId)
    .eq("status", "active");

  if (reportsError) throw new Error(reportsError.message);
  if (!reports?.length) return [];

  const reportIds = reports.map((r) => r.id);
  const nameById = new Map(reports.map((r) => [r.id, r.full_name ?? r.email]));

  const { data, error } = await supabase
    .from("performance_appraisals")
    .select("id, employee_id, status, self_rating, manager_rating, review_cycles(name)")
    .eq("organization_id", organizationId)
    .in("employee_id", reportIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeName: nameById.get(row.employee_id) ?? "Employee",
    cycleName: (row.review_cycles as { name?: string } | null)?.name ?? "Review cycle",
    status: row.status as AppraisalStatus,
    selfRating: row.self_rating,
    managerRating: row.manager_rating,
    canReview: row.status === "pending",
  }));
}

async function assertDirectReport(
  organizationId: string,
  managerEmployeeId: string,
  employeeId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .eq("manager_employee_id", managerEmployeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("You can only review direct reports.");
}

export async function getTeamAppraisal(appraisalId: string) {
  const { employeeId, organizationId } = await requireManagerContext();
  const appraisal = await getAppraisalDetail(organizationId, appraisalId);
  if (!appraisal) return null;

  await assertDirectReport(organizationId, employeeId, appraisal.employeeId);
  return appraisal;
}

export async function submitManagerReview(appraisalId: string, formData: FormData): Promise<void> {
  const { employeeId, organizationId, userId } = await requireManagerContext();
  const appraisal = await getAppraisalDetail(organizationId, appraisalId);
  if (!appraisal) throw new Error("Appraisal not found.");

  await assertDirectReport(organizationId, employeeId, appraisal.employeeId);
  if (appraisal.status !== "pending") {
    throw new Error("This appraisal is not ready for manager review.");
  }
  await assertAppraisalEditable(appraisal);

  const managerRating = parseRating(formData.get("managerRating"));
  const managerComments = String(formData.get("managerComments") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("performance_appraisals")
    .update({
      manager_rating: managerRating,
      manager_comments: managerComments,
      status: "approved",
    })
    .eq("id", appraisalId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: "performance.manager_reviewed",
    resourceType: "performance_appraisal",
    resourceId: appraisalId,
    metadata: { managerEmployeeId: employeeId },
  });
}
