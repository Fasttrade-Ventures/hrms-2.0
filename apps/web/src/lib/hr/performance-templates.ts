import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/log-event";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import {
  appraisalTemplateSchema,
  type AppraisalTemplateInput,
  type RatingScaleConfig,
} from "@hrms/validation";

export type AppraisalTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  targetDepartmentId: string | null;
  targetDepartmentName: string | null;
  isDefault: boolean;
  isActive: boolean;
  sectionsCount: number;
  questionsCount: number;
  activeCyclesCount: number;
  totalCyclesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AppraisalQuestionItem = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  questionType: "rating" | "text" | "yes_no";
  required: boolean;
  sortOrder: number;
};

export type AppraisalSectionItem = {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  weightPct: number;
  sortOrder: number;
  questions: AppraisalQuestionItem[];
};

export type AppraisalTemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  targetDepartmentId: string | null;
  targetDepartmentName: string | null;
  isDefault: boolean;
  isActive: boolean;
  ratingScale: RatingScaleConfig;
  sections: AppraisalSectionItem[];
  activeCyclesCount: number;
  totalCyclesCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function listAppraisalTemplates(): Promise<AppraisalTemplateListItem[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: templates, error } = await supabase
    .from("appraisal_templates")
    .select(`
      id,
      name,
      description,
      target_department_id,
      is_default,
      is_active,
      created_at,
      updated_at,
      departments(name)
    `)
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const results: AppraisalTemplateListItem[] = [];

  for (const t of templates ?? []) {
    const department = Array.isArray(t.departments) ? t.departments[0] : t.departments;

    // Count sections & questions
    const { data: sections } = await supabase
      .from("appraisal_template_sections")
      .select("id")
      .eq("template_id", t.id);

    const sectionIds = (sections ?? []).map((s) => s.id);
    let questionsCount = 0;
    if (sectionIds.length > 0) {
      const { count } = await supabase
        .from("appraisal_template_questions")
        .select("id", { count: "exact", head: true })
        .in("section_id", sectionIds);
      questionsCount = count ?? 0;
    }

    // Count active cycles linked to this template
    const { count: activeCyclesCount } = await supabase
      .from("review_cycles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("template_id", t.id)
      .is("closed_at", null);

    // Count total cycles linked to this template
    const { count: totalCyclesCount } = await supabase
      .from("review_cycles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("template_id", t.id);

    results.push({
      id: t.id,
      name: t.name,
      description: t.description,
      targetDepartmentId: t.target_department_id,
      targetDepartmentName: department?.name ?? null,
      isDefault: t.is_default,
      isActive: t.is_active,
      sectionsCount: (sections ?? []).length,
      questionsCount,
      activeCyclesCount: activeCyclesCount ?? 0,
      totalCyclesCount: totalCyclesCount ?? 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    });
  }

  return results;
}

export async function getAppraisalTemplateDetail(templateId: string): Promise<AppraisalTemplateDetail | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: t, error } = await supabase
    .from("appraisal_templates")
    .select(`
      id,
      name,
      description,
      target_department_id,
      is_default,
      is_active,
      rating_scale,
      created_at,
      updated_at,
      departments(name)
    `)
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!t) return null;

  const department = Array.isArray(t.departments) ? t.departments[0] : t.departments;

  // Fetch sections ordered
  const { data: sections, error: sectionsError } = await supabase
    .from("appraisal_template_sections")
    .select("id, template_id, title, description, weight_pct, sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sectionsError) throw new Error(sectionsError.message);

  const sectionIds = (sections ?? []).map((s) => s.id);
  const questionsBySection: Record<string, AppraisalQuestionItem[]> = {};

  if (sectionIds.length > 0) {
    const { data: questions, error: questionsError } = await supabase
      .from("appraisal_template_questions")
      .select("id, section_id, title, description, question_type, required, sort_order")
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (questionsError) throw new Error(questionsError.message);

    for (const q of questions ?? []) {
      const list = questionsBySection[q.section_id] ?? [];
      list.push({
        id: q.id,
        sectionId: q.section_id,
        title: q.title,
        description: q.description,
        questionType: q.question_type as "rating" | "text" | "yes_no",
        required: q.required,
        sortOrder: q.sort_order,
      });
      questionsBySection[q.section_id] = list;
    }
  }

  const { count: activeCyclesCount } = await supabase
    .from("review_cycles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("template_id", templateId)
    .is("closed_at", null);

  const { count: totalCyclesCount } = await supabase
    .from("review_cycles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("template_id", templateId);

  const mappedSections: AppraisalSectionItem[] = (sections ?? []).map((s) => ({
    id: s.id,
    templateId: s.template_id,
    title: s.title,
    description: s.description,
    weightPct: Number(s.weight_pct) || 0,
    sortOrder: s.sort_order,
    questions: questionsBySection[s.id] ?? [],
  }));

  const scaleLabels = t.rating_scale && typeof t.rating_scale === "object" && "labels" in (t.rating_scale as any)
    ? (t.rating_scale as any).labels
    : {
        "1": "Unsatisfactory",
        "2": "Needs Improvement",
        "3": "Meets Expectations",
        "4": "Exceeds Expectations",
        "5": "Outstanding",
      };

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    targetDepartmentId: t.target_department_id,
    targetDepartmentName: department?.name ?? null,
    isDefault: t.is_default,
    isActive: t.is_active,
    ratingScale: (t.rating_scale as RatingScaleConfig) ?? {
      min: 1,
      max: 5,
      step: 1,
      labels: scaleLabels,
    },
    sections: mappedSections,
    activeCyclesCount: activeCyclesCount ?? 0,
    totalCyclesCount: totalCyclesCount ?? 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function createAppraisalTemplate(
  rawInput: unknown,
  actorUserId?: string | null,
): Promise<string> {
  await requireRole("hr_administrator");
  const input = appraisalTemplateSchema.parse(rawInput);
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  if (input.isDefault) {
    // Unset existing default templates in org
    await supabase
      .from("appraisal_templates")
      .update({ is_default: false })
      .eq("organization_id", organizationId);
  }

  const { data: template, error: templateError } = await supabase
    .from("appraisal_templates")
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description ?? null,
      target_department_id: input.targetDepartmentId || null,
      is_default: input.isDefault,
      is_active: input.isActive,
      rating_scale: input.ratingScale,
    })
    .select("id")
    .single();

  if (templateError || !template) {
    throw new Error(templateError?.message ?? "Failed to create appraisal template.");
  }

  for (const [sIdx, s] of input.sections.entries()) {
    const { data: section, error: sectionError } = await supabase
      .from("appraisal_template_sections")
      .insert({
        template_id: template.id,
        title: s.title,
        description: s.description ?? null,
        weight_pct: s.weightPct,
        sort_order: s.sortOrder ?? sIdx,
      })
      .select("id")
      .single();

    if (sectionError || !section) {
      throw new Error(sectionError?.message ?? "Failed to create template section.");
    }

    const questionInserts = s.questions.map((q, qIdx) => ({
      section_id: section.id,
      title: q.title,
      description: q.description ?? null,
      question_type: q.questionType,
      required: q.required,
      sort_order: q.sortOrder ?? qIdx,
    }));

    if (questionInserts.length > 0) {
      const { error: questionsError } = await supabase
        .from("appraisal_template_questions")
        .insert(questionInserts);

      if (questionsError) throw new Error(questionsError.message);
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "performance.template_created",
    resourceType: "appraisal_template",
    resourceId: template.id,
    metadata: { name: input.name, sectionsCount: input.sections.length },
  });

  return template.id;
}

export async function updateAppraisalTemplate(
  templateId: string,
  rawInput: unknown,
  actorUserId?: string | null,
): Promise<void> {
  await requireRole("hr_administrator");
  const input = appraisalTemplateSchema.parse(rawInput);
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const existing = await getAppraisalTemplateDetail(templateId);
  if (!existing) throw new Error("Template not found.");

  const isLocked = existing.activeCyclesCount > 0;

  if (input.isDefault) {
    await supabase
      .from("appraisal_templates")
      .update({ is_default: false })
      .eq("organization_id", organizationId)
      .neq("id", templateId);
  }

  const { error: updateError } = await supabase
    .from("appraisal_templates")
    .update({
      name: input.name,
      description: input.description ?? null,
      target_department_id: input.targetDepartmentId || null,
      is_default: input.isDefault,
      is_active: input.isActive,
      ...(isLocked ? {} : { rating_scale: input.ratingScale }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  // If template is not locked by active cycles, replace sections and questions cleanly
  if (!isLocked) {
    await supabase.from("appraisal_template_sections").delete().eq("template_id", templateId);

    for (const [sIdx, s] of input.sections.entries()) {
      const { data: section, error: sectionError } = await supabase
        .from("appraisal_template_sections")
        .insert({
          template_id: templateId,
          title: s.title,
          description: s.description ?? null,
          weight_pct: s.weightPct,
          sort_order: s.sortOrder ?? sIdx,
        })
        .select("id")
        .single();

      if (sectionError || !section) {
        throw new Error(sectionError?.message ?? "Failed to update template section.");
      }

      const questionInserts = s.questions.map((q, qIdx) => ({
        section_id: section.id,
        title: q.title,
        description: q.description ?? null,
        question_type: q.questionType,
        required: q.required,
        sort_order: q.sortOrder ?? qIdx,
      }));

      if (questionInserts.length > 0) {
        const { error: questionsError } = await supabase
          .from("appraisal_template_questions")
          .insert(questionInserts);

        if (questionsError) throw new Error(questionsError.message);
      }
    }
  }

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "performance.template_updated",
    resourceType: "appraisal_template",
    resourceId: templateId,
    metadata: { name: input.name, isActive: input.isActive, isLocked },
  });
}

export async function toggleAppraisalTemplateActive(
  templateId: string,
  isActive: boolean,
  actorUserId?: string | null,
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { error } = await supabase
    .from("appraisal_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: isActive ? "performance.template_activated" : "performance.template_deactivated",
    resourceType: "appraisal_template",
    resourceId: templateId,
    metadata: { isActive },
  });
}

export async function cloneAppraisalTemplate(
  templateId: string,
  actorUserId?: string | null,
): Promise<string> {
  await requireRole("hr_administrator");
  const existing = await getAppraisalTemplateDetail(templateId);
  if (!existing) throw new Error("Template not found.");

  const clonedInput: AppraisalTemplateInput = {
    name: `${existing.name} (Copy)`,
    description: existing.description,
    targetDepartmentId: existing.targetDepartmentId,
    isDefault: false,
    isActive: true,
    ratingScale: existing.ratingScale,
    sections: existing.sections.map((s) => ({
      title: s.title,
      description: s.description,
      weightPct: s.weightPct,
      sortOrder: s.sortOrder,
      questions: s.questions.map((q) => ({
        title: q.title,
        description: q.description,
        questionType: q.questionType,
        required: q.required,
        sortOrder: q.sortOrder,
      })),
    })),
  };

  const newId = await createAppraisalTemplate(clonedInput, actorUserId);
  return newId;
}

export async function deleteAppraisalTemplate(
  templateId: string,
  actorUserId?: string | null,
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const existing = await getAppraisalTemplateDetail(templateId);
  if (!existing) throw new Error("Template not found.");

  if (existing.totalCyclesCount > 0) {
    const { data: cycles } = await supabase
      .from("review_cycles")
      .select("name")
      .eq("organization_id", organizationId)
      .eq("template_id", templateId)
      .limit(3);

    const cycleNames = (cycles ?? []).map((c) => `"${c.name}"`).join(", ");
    throw new Error(
      `Cannot delete template "${existing.name}" because it is assigned to ${existing.totalCyclesCount} review cycle(s) (${cycleNames}). To retire this template without breaking historical records, deactivate it in Edit mode.`,
    );
  }

  const { error } = await supabase
    .from("appraisal_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "performance.template_deleted",
    resourceType: "appraisal_template",
    resourceId: templateId,
    metadata: { name: existing.name },
  });
}

export async function setDefaultAppraisalTemplate(
  templateId: string,
  actorUserId?: string | null,
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  await supabase
    .from("appraisal_templates")
    .update({ is_default: false })
    .eq("organization_id", organizationId);

  const { error } = await supabase
    .from("appraisal_templates")
    .update({ is_default: true })
    .eq("id", templateId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "performance.template_set_default",
    resourceType: "appraisal_template",
    resourceId: templateId,
  });
}
