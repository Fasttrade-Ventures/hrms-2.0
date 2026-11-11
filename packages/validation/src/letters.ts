import { z } from "zod";

export const letterTemplateTypeSchema = z.enum(["offer", "employment_agreement"]);

export const letterTemplateBodySchema = z.string().trim().min(10, "Body must be at least 10 characters.").max(50000);

export const createLetterTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: letterTemplateTypeSchema,
  body: letterTemplateBodySchema,
  isActive: z.boolean().default(true),
  /** Per-template letterhead override. `undefined` = unchanged, `null` = clear (use org default). */
  letterheadFileId: z.string().uuid().nullable().optional(),
});

export const updateLetterTemplateSchema = createLetterTemplateSchema.extend({
  templateId: z.string().uuid(),
});

export const previewLetterTemplateSchema = z.object({
  body: letterTemplateBodySchema,
});

export type LetterTemplateType = z.infer<typeof letterTemplateTypeSchema>;
export type CreateLetterTemplateInput = z.infer<typeof createLetterTemplateSchema>;
export type UpdateLetterTemplateInput = z.infer<typeof updateLetterTemplateSchema>;
