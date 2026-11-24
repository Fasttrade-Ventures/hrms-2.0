import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { assertAppraisalEditable, getAppraisalDetail } from "@/lib/performance/appraisals";
import { getTemplateSectionsForForm, parseSelfCriteriaResponses } from "@/lib/performance/criteria";
import { logAuditEvent } from "@/lib/audit/log-event";
import type { EmployeeAppraisalListItem } from "@/lib/performance/types";
import { parseRating } from "@/lib/performance/types";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function listMyAppraisals(): Promise<EmployeeAppraisalListItem[]> {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("performance_appraisals")
    .select("id, status, self_rating, manager_rating, review_cycles(name, due_date, closed_at)")
    .eq("organization_id", await requireOrganizationId())
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const cycle = Array.isArray(row.review_cycles) ? row.review_cycles[0] : row.review_cycles;
    return {
      id: row.id,
      cycleName: cycle?.name ?? "Review cycle",
      dueDate: cycle?.due_date ?? "",
      status: row.status as EmployeeAppraisalListItem["status"],
      selfRating: row.self_rating,
      managerRating: row.manager_rating,
      cycleClosed: Boolean(cycle?.closed_at),
    };
  });
}

export async function getMyAppraisal(appraisalId: string) {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account.");

  const appraisal = await getAppraisalDetail(await requireOrganizationId(), appraisalId, employeeId);
  if (!appraisal || appraisal.employeeId !== employeeId) return null;
  return appraisal;
}

export async function submitSelfAppraisal(appraisalId: string, formData: FormData): Promise<void> {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account.");

  const organizationId = await requireOrganizationId();
  const appraisal = await getAppraisalDetail(organizationId, appraisalId, employeeId);
  if (!appraisal || appraisal.employeeId !== employeeId) {
    throw new Error("Appraisal not found.");
  }
  if (appraisal.status !== "draft") {
    throw new Error("This appraisal has already been submitted.");
  }
  await assertAppraisalEditable(appraisal);

  const { letterHtmlToText, sanitizeLetterHtml } = await import("@/lib/letters/html-text");
  const selfRating = parseRating(formData.get("selfRating"));
  const rawComments = sanitizeLetterHtml(String(formData.get("selfComments") ?? "").trim());
  const selfComments = letterHtmlToText(rawComments).trim() ? rawComments : null;

  const sections = await getTemplateSectionsForForm(appraisal.templateId);
  const criteriaResponses = parseSelfCriteriaResponses(
    sections,
    formData,
    appraisal.criteriaResponses ?? [],
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("performance_appraisals")
    .update({
      self_rating: selfRating,
      self_comments: selfComments,
      criteria_responses: criteriaResponses,
      status: "pending",
    })
    .eq("id", appraisalId)
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: session.user.id,
    action: "performance.self_submitted",
    resourceType: "performance_appraisal",
    resourceId: appraisalId,
  });
}
