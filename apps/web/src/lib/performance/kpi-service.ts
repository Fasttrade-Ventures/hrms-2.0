import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { weightedKpiRating, type KpiScoreInput } from "@/lib/performance/kpi-scores";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppraisalKpiRow = KpiScoreInput & {
  kpiId: string;
  target: string | null;
};

export async function listTemplateKpis(templateId: string): Promise<Array<{ id: string; name: string; weight: number; target: string | null }>> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appraisal_template_kpis")
    .select("id, name, weight, target")
    .eq("organization_id", organizationId)
    .eq("template_id", templateId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    weight: Number(row.weight),
    target: row.target,
  }));
}

export async function addTemplateKpi(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const templateId = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("weight") ?? 0);
  const target = String(formData.get("target") ?? "").trim();
  if (!templateId || !name || !(weight > 0) || weight > 100) {
    throw new Error("Enter a KPI name and a weight between 1 and 100.");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("appraisal_template_kpis").insert({
    organization_id: organizationId,
    template_id: templateId,
    name,
    weight,
    target: target || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/hr/performance/templates/${templateId}/edit`);
}

export async function listAppraisalKpis(appraisalId: string): Promise<{ rows: AppraisalKpiRow[]; rating: number | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appraisal_kpi_scores")
    .select("kpi_id, employee_score, manager_score, appraisal_template_kpis(name, weight, target)")
    .eq("appraisal_id", appraisalId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => {
    const kpi = Array.isArray(row.appraisal_template_kpis)
      ? row.appraisal_template_kpis[0]
      : row.appraisal_template_kpis;
    return {
      kpiId: row.kpi_id,
      name: kpi?.name ?? "KPI",
      weight: Number(kpi?.weight ?? 0),
      target: kpi?.target ?? null,
      employeeScore: row.employee_score == null ? null : Number(row.employee_score),
      managerScore: row.manager_score == null ? null : Number(row.manager_score),
    };
  });
  return { rows, rating: weightedKpiRating(rows) };
}

async function saveScore(appraisalId: string, field: "employee_score" | "manager_score", formData: FormData) {
  const kpiId = String(formData.get("kpiId") ?? "");
  const score = Number(formData.get("score"));
  if (!kpiId || !Number.isFinite(score)) throw new Error("Enter a score.");
  const admin = createAdminClient();
  const { error } = await admin
    .from("appraisal_kpi_scores")
    .update({ [field]: score })
    .eq("appraisal_id", appraisalId)
    .eq("kpi_id", kpiId);
  if (error) throw new Error(error.message);
}

export async function saveEmployeeKpiScore(appraisalId: string, formData: FormData): Promise<void> {
  await requireEmployeeContext();
  await saveScore(appraisalId, "employee_score", formData);
  revalidatePath(`/employee/performance/${appraisalId}`);
}

export async function saveManagerKpiScore(appraisalId: string, formData: FormData): Promise<void> {
  await requireRole("manager");
  await saveScore(appraisalId, "manager_score", formData);
  revalidatePath(`/manager/team-performance/${appraisalId}`);
}
