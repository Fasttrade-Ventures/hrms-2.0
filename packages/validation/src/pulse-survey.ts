import { z } from "zod";

export const pulseQuestionTypeSchema = z.enum([
  "rating",
  "enps",
  "yes_no",
  "single_choice",
  "multi_choice",
  "short_text",
  "long_text",
]);

export const pulseRatingScaleSchema = z.object({
  min: z.number().int().min(0).max(10),
  max: z.number().int().min(1).max(10),
  labels: z.record(z.string(), z.string()).optional(),
});

export const pulseChoiceSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, "Choice label is required").max(255),
  sortOrder: z.number().int().min(0).default(0),
});

export const pulseQuestionSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(1, "Question title is required").max(500),
    description: z.string().max(2000).optional().nullable(),
    questionType: pulseQuestionTypeSchema,
    required: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
    ratingScale: pulseRatingScaleSchema.optional().nullable(),
    choices: z.array(pulseChoiceSchema).default([]),
  })
  .superRefine((question, ctx) => {
    if (question.questionType === "rating") {
      const scale = question.ratingScale;
      if (!scale) {
        ctx.addIssue({ code: "custom", message: "Rating questions need a scale.", path: ["ratingScale"] });
      } else if (scale.max <= scale.min) {
        ctx.addIssue({ code: "custom", message: "Rating max must be greater than min.", path: ["ratingScale"] });
      }
    }
    if (question.questionType === "enps") {
      // Fixed 0–10; scale is optional and ignored if present.
    }
    if (question.questionType === "single_choice" || question.questionType === "multi_choice") {
      if (question.choices.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Choice questions need at least two options.",
          path: ["choices"],
        });
      }
    }
  });

export const pulseSectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Section title is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  questions: z.array(pulseQuestionSchema).min(1, "Each section must have at least one question"),
});

export const pulseSurveyTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
  sections: z.array(pulseSectionSchema).min(1, "Template must have at least one section"),
});

export const openPulseSurveyRunSchema = z.object({
  templateId: z.string().uuid(),
  opensOn: z.string().date(),
  closesOn: z.string().date(),
  branchId: z.string().uuid().optional().nullable(),
  targetRoles: z.array(z.enum(["employee", "manager"])).default([]),
  targetDepartmentIds: z.array(z.string().uuid()).default([]),
  publicLinkEnabled: z.boolean().default(false),
}).superRefine((input, ctx) => {
  if (input.closesOn < input.opensOn) {
    ctx.addIssue({ code: "custom", message: "Close date must be on or after the open date.", path: ["closesOn"] });
  }
});

export const pulseAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  score: z.number().int().min(0).max(10).optional().nullable(),
  textValue: z.string().max(5000).optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
  choiceIds: z.array(z.string().uuid()).default([]),
});

export const submitPulseSurveySchema = z.object({
  runId: z.string().uuid(),
  answers: z.array(pulseAnswerInputSchema).min(1),
});

export type PulseQuestionType = z.infer<typeof pulseQuestionTypeSchema>;
export type PulseRatingScale = z.infer<typeof pulseRatingScaleSchema>;
export type PulseChoiceInput = z.infer<typeof pulseChoiceSchema>;
export type PulseQuestionInput = z.infer<typeof pulseQuestionSchema>;
export type PulseSectionInput = z.infer<typeof pulseSectionSchema>;
export type PulseSurveyTemplateInput = z.infer<typeof pulseSurveyTemplateSchema>;
export type OpenPulseSurveyRunInput = z.infer<typeof openPulseSurveyRunSchema>;
export type PulseAnswerInput = z.infer<typeof pulseAnswerInputSchema>;
export type SubmitPulseSurveyInput = z.infer<typeof submitPulseSurveySchema>;
