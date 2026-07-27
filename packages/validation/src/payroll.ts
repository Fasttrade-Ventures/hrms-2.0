import { z } from "zod";

export const createPayrunSchema = z.object({
  payGroupId: z.string().uuid().optional(),
  scope: z.enum(["pay_group", "org_wide"]),
  payrunType: z.enum(["regular", "adjustment"]).default("regular"),
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12).optional(),
  periodWeek: z.number().int().min(1).max(53).optional(),
  earningPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  earningPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const editPayrunLineSchema = z.object({
  payrunItemId: z.string().uuid(),
  componentCode: z.string().min(1),
  amount: z.number(),
});

export const createPayGroupSchema = z.object({
  name: z.string().min(1).max(200),
  cycle: z.enum(["monthly", "weekly", "biweekly"]),
  cutoffDay: z.coerce.number().int().min(1).max(28),
});

export const updatePayGroupSchema = createPayGroupSchema;

export type CreatePayrunInput = z.infer<typeof createPayrunSchema>;
export type EditPayrunLineInput = z.infer<typeof editPayrunLineSchema>;
export type CreatePayGroupInput = z.infer<typeof createPayGroupSchema>;
export type UpdatePayGroupInput = z.infer<typeof updatePayGroupSchema>;
