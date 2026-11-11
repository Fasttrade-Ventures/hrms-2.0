import {
  pulseSurveyTemplateSchema,
  type PulseQuestionType,
  type PulseRatingScale,
  type PulseSurveyTemplateInput,
} from "@hrms/validation";

import { logAuditEvent } from "@/lib/audit/log-event";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PulseChoiceItem = {
  id: string;
  label: string;
  sortOrder: number;
};

export type PulseQuestionItem = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  questionType: PulseQuestionType;
  required: boolean;
  sortOrder: number;
  ratingScale: PulseRatingScale | null;
  choices: PulseChoiceItem[];
};

export type PulseSectionItem = {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: PulseQuestionItem[];
};

export type PulseTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sectionsCount: number;
  questionsCount: number;
  runsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PulseTemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sections: PulseSectionItem[];
  runsCount: number;
  createdAt: string;
  updatedAt: string;
};

async function insertTemplateTree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string,
  input: PulseSurveyTemplateInput,
) {
  for (const [sIdx, section] of input.sections.entries()) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from("pulse_survey_template_sections")
      .insert({
        template_id: templateId,
        title: section.title,
        description: section.description ?? null,
        sort_order: section.sortOrder ?? sIdx,
      })
      .select("id")
      .single();

    if (sectionError || !sectionRow) {
      throw new Error(sectionError?.message ?? "Failed to create survey section.");
    }

    for (const [qIdx, question] of section.questions.entries()) {
      const ratingScale =
        question.questionType === "enps"
          ? { min: 0, max: 10, labels: { "0": "Not at all likely", "10": "Extremely likely" } }
          : question.questionType === "rating"
            ? (question.ratingScale ?? { min: 1, max: 5 })
            : null;

      const { data: questionRow, error: questionError } = await supabase
        .from("pulse_survey_template_questions")
        .insert({
          section_id: sectionRow.id,
          title: question.title,
          description: question.description ?? null,
          question_type: question.questionType,
          required: question.required,
          sort_order: question.sortOrder ?? qIdx,
          rating_scale: ratingScale,
        })
        .select("id")
        .single();

      if (questionError || !questionRow) {
        throw new Error(questionError?.message ?? "Failed to create survey question.");
      }

      if (
        (question.questionType === "single_choice" || question.questionType === "multi_choice") &&
        question.choices.length > 0
      ) {
        const { error: choicesError } = await supabase.from("pulse_survey_template_choices").insert(
          question.choices.map((choice, cIdx) => ({
            question_id: questionRow.id,
            label: choice.label,
            sort_order: choice.sortOrder ?? cIdx,
          })),
        );
        if (choicesError) throw new Error(choicesError.message);
      }
    }
  }
}

export async function listPulseSurveyTemplates(): Promise<PulseTemplateListItem[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: templates, error } = await supabase
    .from("pulse_survey_templates")
    .select("id, name, description, is_active, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const results: PulseTemplateListItem[] = [];
  for (const template of templates ?? []) {
    const { data: sections } = await supabase
      .from("pulse_survey_template_sections")
      .select("id")
      .eq("template_id", template.id);
    const sectionIds = (sections ?? []).map((row) => row.id);
    let questionsCount = 0;
    if (sectionIds.length > 0) {
      const { count } = await supabase
        .from("pulse_survey_template_questions")
        .select("id", { count: "exact", head: true })
        .in("section_id", sectionIds);
      questionsCount = count ?? 0;
    }
    const { count: runsCount } = await supabase
      .from("pulse_survey_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("template_id", template.id);

    results.push({
      id: template.id,
      name: template.name,
      description: template.description,
      isActive: template.is_active,
      sectionsCount: sectionIds.length,
      questionsCount,
      runsCount: runsCount ?? 0,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    });
  }

  return results;
}

export async function getPulseSurveyTemplateDetail(templateId: string): Promise<PulseTemplateDetail | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: template, error } = await supabase
    .from("pulse_survey_templates")
    .select("id, name, description, is_active, created_at, updated_at")
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!template) return null;

  const { data: sections, error: sectionsError } = await supabase
    .from("pulse_survey_template_sections")
    .select("id, template_id, title, description, sort_order")
    .eq("template_id", templateId)
    .order("sort_order");

  if (sectionsError) throw new Error(sectionsError.message);

  const sectionIds = (sections ?? []).map((row) => row.id);
  const questionsBySection: Record<string, PulseQuestionItem[]> = {};

  if (sectionIds.length > 0) {
    const { data: questions, error: questionsError } = await supabase
      .from("pulse_survey_template_questions")
      .select("id, section_id, title, description, question_type, required, sort_order, rating_scale")
      .in("section_id", sectionIds)
      .order("sort_order");

    if (questionsError) throw new Error(questionsError.message);

    const questionIds = (questions ?? []).map((row) => row.id);
    const choicesByQuestion: Record<string, PulseChoiceItem[]> = {};

    if (questionIds.length > 0) {
      const { data: choices, error: choicesError } = await supabase
        .from("pulse_survey_template_choices")
        .select("id, question_id, label, sort_order")
        .in("question_id", questionIds)
        .order("sort_order");
      if (choicesError) throw new Error(choicesError.message);
      for (const choice of choices ?? []) {
        const list = choicesByQuestion[choice.question_id] ?? [];
        list.push({ id: choice.id, label: choice.label, sortOrder: choice.sort_order });
        choicesByQuestion[choice.question_id] = list;
      }
    }

    for (const question of questions ?? []) {
      const list = questionsBySection[question.section_id] ?? [];
      list.push({
        id: question.id,
        sectionId: question.section_id,
        title: question.title,
        description: question.description,
        questionType: question.question_type as PulseQuestionType,
        required: question.required,
        sortOrder: question.sort_order,
        ratingScale: (question.rating_scale as PulseRatingScale | null) ?? null,
        choices: choicesByQuestion[question.id] ?? [],
      });
      questionsBySection[question.section_id] = list;
    }
  }

  const { count: runsCount } = await supabase
    .from("pulse_survey_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("template_id", templateId);

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    isActive: template.is_active,
    sections: (sections ?? []).map((section) => ({
      id: section.id,
      templateId: section.template_id,
      title: section.title,
      description: section.description,
      sortOrder: section.sort_order,
      questions: questionsBySection[section.id] ?? [],
    })),
    runsCount: runsCount ?? 0,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

export async function createPulseSurveyTemplate(
  rawInput: unknown,
  actorUserId?: string | null,
): Promise<string> {
  await requireRole("hr_administrator");
  const input = pulseSurveyTemplateSchema.parse(rawInput);
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: template, error } = await supabase
    .from("pulse_survey_templates")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: input.isActive,
      created_by: actorUserId ?? null,
    })
    .select("id")
    .single();

  if (error || !template) throw new Error(error?.message ?? "Failed to create survey template.");

  await insertTemplateTree(supabase, template.id, input);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "pulse.template_created",
    resourceType: "pulse_survey_template",
    resourceId: template.id,
    metadata: { name: input.name, sectionsCount: input.sections.length },
  });

  return template.id;
}

export async function updatePulseSurveyTemplate(
  templateId: string,
  rawInput: unknown,
  actorUserId?: string | null,
): Promise<void> {
  await requireRole("hr_administrator");
  const input = pulseSurveyTemplateSchema.parse(rawInput);
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const existing = await getPulseSurveyTemplateDetail(templateId);
  if (!existing) throw new Error("Template not found.");

  const { error } = await supabase
    .from("pulse_survey_templates")
    .update({
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await supabase.from("pulse_survey_template_sections").delete().eq("template_id", templateId);
  await insertTemplateTree(supabase, templateId, input);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "pulse.template_updated",
    resourceType: "pulse_survey_template",
    resourceId: templateId,
    metadata: { name: input.name, sectionsCount: input.sections.length },
  });
}

export async function setPulseSurveyTemplateActive(templateId: string, isActive: boolean): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();
  const { error } = await supabase
    .from("pulse_survey_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}

export async function deletePulseSurveyTemplate(templateId: string): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { count } = await supabase
    .from("pulse_survey_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("template_id", templateId);

  if ((count ?? 0) > 0) {
    throw new Error("This template has been used in a survey. Deactivate it instead of deleting.");
  }

  const { error } = await supabase
    .from("pulse_survey_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}
