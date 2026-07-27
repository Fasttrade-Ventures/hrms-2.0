import { z } from "zod";

export const companyEventKindSchema = z.enum([
  "training",
  "office_closure",
  "town_hall",
  "other",
]);

export const companyEventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    kind: companyEventKindSchema,
    startDate: z.string().date(),
    endDate: z.string().date(),
    branchId: z.string().uuid().optional().nullable(),
    targetDepartmentIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endDate"],
      });
    }
  });

export type CompanyEventFormInput = z.infer<typeof companyEventFormSchema>;
