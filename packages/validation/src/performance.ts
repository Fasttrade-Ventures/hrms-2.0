import { z } from "zod";

export const appraisalQuestionTypeSchema = z.enum(["rating", "text", "yes_no"]);

export const appraisalQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Question title is required").max(255),
  description: z.string().max(1000).optional().nullable(),
  questionType: appraisalQuestionTypeSchema.default("rating"),
  required: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const appraisalSectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Section title is required").max(255),
  description: z.string().max(1000).optional().nullable(),
  weightPct: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().min(0).default(0),
  questions: z.array(appraisalQuestionSchema).min(1, "Each section must have at least one question"),
});

export const ratingScaleSchema = z.object({
  min: z.number().int().min(1).default(1),
  max: z.number().int().min(2).max(10).default(5),
  step: z.number().min(0.5).max(1).default(1),
  labels: z.record(z.string(), z.string()).optional(),
});

export const appraisalTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  targetDepartmentId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  ratingScale: ratingScaleSchema.default({
    min: 1,
    max: 5,
    step: 1,
    labels: {
      "1": "Unsatisfactory",
      "2": "Needs Improvement",
      "3": "Meets Expectations",
      "4": "Exceeds Expectations",
      "5": "Outstanding",
    },
  }),
  sections: z.array(appraisalSectionSchema).min(1, "Template must have at least one section"),
});

export const createReviewCycleWithTemplateSchema = z.object({
  name: z.string().min(1, "Cycle name is required").max(255),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  dueDate: z.string().date(),
  templateId: z.string().uuid().optional().nullable(),
  targetDepartmentId: z.string().uuid().optional().nullable(),
});

export type AppraisalQuestionType = z.infer<typeof appraisalQuestionTypeSchema>;
export type AppraisalQuestionInput = z.infer<typeof appraisalQuestionSchema>;
export type AppraisalSectionInput = z.infer<typeof appraisalSectionSchema>;
export type RatingScaleConfig = z.infer<typeof ratingScaleSchema>;
export type AppraisalTemplateInput = z.infer<typeof appraisalTemplateSchema>;
export type CreateReviewCycleWithTemplateInput = z.infer<typeof createReviewCycleWithTemplateSchema>;
