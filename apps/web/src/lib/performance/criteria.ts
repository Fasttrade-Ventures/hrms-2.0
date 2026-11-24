import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";

import type { CriteriaResponse } from "./types";

export type AppraisalQuestionType = "rating" | "text" | "yes_no" | "number";

export type TemplateQuestionForForm = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  questionType: AppraisalQuestionType;
  required: boolean;
  sortOrder: number;
};

export type TemplateSectionForForm = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: TemplateQuestionForForm[];
};

export async function getTemplateSectionsForForm(
  templateId: string | null | undefined,
): Promise<TemplateSectionForForm[]> {
  if (!templateId) return [];

  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: template, error: templateError } = await supabase
    .from("appraisal_templates")
    .select("id")
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (templateError) throw new Error(templateError.message);
  if (!template) return [];

  const { data: sections, error: sectionsError } = await supabase
    .from("appraisal_template_sections")
    .select("id, title, description, sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sectionsError) throw new Error(sectionsError.message);
  if (!sections?.length) return [];

  const sectionIds = sections.map((s) => s.id);
  const { data: questions, error: questionsError } = await supabase
    .from("appraisal_template_questions")
    .select("id, section_id, title, description, question_type, required, sort_order")
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (questionsError) throw new Error(questionsError.message);

  const bySection: Record<string, TemplateQuestionForForm[]> = {};
  for (const q of questions ?? []) {
    const list = bySection[q.section_id] ?? [];
    list.push({
      id: q.id,
      sectionId: q.section_id,
      title: q.title,
      description: q.description,
      questionType: q.question_type as AppraisalQuestionType,
      required: q.required,
      sortOrder: q.sort_order,
    });
    bySection[q.section_id] = list;
  }

  return sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    sortOrder: s.sort_order,
    questions: bySection[s.id] ?? [],
  }));
}

function fieldKey(questionId: string, field: string): string {
  return `criteria__${questionId}__${field}`;
}

function readOptionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

function parseRequiredRating(value: FormDataEntryValue | null, title: string): number {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Please rate: ${title}`);
  }
  return rating;
}

function parseRequiredYesNo(value: FormDataEntryValue | null, title: string): boolean {
  if (value === "yes") return true;
  if (value === "no") return false;
  throw new Error(`Please answer Yes or No: ${title}`);
}

function parseRequiredNumber(value: FormDataEntryValue | null, title: string): number {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`Please enter a number for: ${title}`);
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Enter a valid number (0 or more) for: ${title}`);
  }
  return num;
}

export function parseSelfCriteriaResponses(
  sections: TemplateSectionForForm[],
  formData: FormData,
  existing: CriteriaResponse[] = [],
): CriteriaResponse[] {
  const existingById = new Map(existing.map((r) => [r.questionId, r]));
  const next: CriteriaResponse[] = [];

  for (const section of sections) {
    for (const question of section.questions) {
      const prev = existingById.get(question.id) ?? {
        questionId: question.id,
        sectionId: question.sectionId,
      };
      const entry: CriteriaResponse = {
        ...prev,
        questionId: question.id,
        sectionId: question.sectionId,
      };

      if (question.questionType === "rating") {
        const raw = formData.get(fieldKey(question.id, "rating"));
        if (question.required || (raw != null && String(raw) !== "")) {
          entry.selfRating = parseRequiredRating(raw, question.title);
        } else {
          entry.selfRating = null;
        }
      } else if (question.questionType === "yes_no") {
        const raw = formData.get(fieldKey(question.id, "yes_no"));
        if (question.required || (raw != null && String(raw) !== "")) {
          entry.selfBoolean = parseRequiredYesNo(raw, question.title);
        } else {
          entry.selfBoolean = null;
        }
        entry.selfText = readOptionalText(formData, fieldKey(question.id, "comment"));
      } else if (question.questionType === "number") {
        const raw = formData.get(fieldKey(question.id, "number"));
        if (question.required || (raw != null && String(raw).trim() !== "")) {
          entry.selfNumber = parseRequiredNumber(raw, question.title);
        } else {
          entry.selfNumber = null;
        }
      } else {
        const text = readOptionalText(formData, fieldKey(question.id, "text"));
        if (question.required && !text) {
          throw new Error(`Please answer: ${question.title}`);
        }
        entry.selfText = text;
      }

      next.push(entry);
    }
  }

  return next;
}

export function parseManagerCriteriaResponses(
  sections: TemplateSectionForForm[],
  formData: FormData,
  existing: CriteriaResponse[] = [],
): CriteriaResponse[] {
  const existingById = new Map(existing.map((r) => [r.questionId, r]));
  const next: CriteriaResponse[] = [];

  for (const section of sections) {
    for (const question of section.questions) {
      const prev = existingById.get(question.id) ?? {
        questionId: question.id,
        sectionId: question.sectionId,
      };
      const entry: CriteriaResponse = {
        ...prev,
        questionId: question.id,
        sectionId: question.sectionId,
      };

      // Manager review of this questionnaire is read-only for answers;
      // optional per-question note can be stored as managerText.
      const note = readOptionalText(formData, fieldKey(question.id, "manager_note"));
      if (note) entry.managerText = note;

      next.push(entry);
    }
  }

  return next;
}

export function criteriaFieldName(questionId: string, field: string): string {
  return fieldKey(questionId, field);
}
