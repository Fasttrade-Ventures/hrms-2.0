import { z } from "zod";

export const applyBehalfLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  halfDay: z.boolean().default(false),
  reason: z.string().max(2000).optional(),
});

export const applyBehalfLateSchema = z.object({
  employeeId: z.string().uuid(),
  requestDate: z.string().date(),
  actualArrivalTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM format"),
  reason: z.string().max(2000).optional(),
});

export const applyBehalfListFilterSchema = z.object({
  type: z.enum(["all", "leave", "late"]).default("all"),
  range: z.enum(["all", "week", "history"]).default("all"),
});

export type ApplyBehalfLeaveInput = z.infer<typeof applyBehalfLeaveSchema>;
export type ApplyBehalfLateInput = z.infer<typeof applyBehalfLateSchema>;
export type ApplyBehalfListFilter = z.infer<typeof applyBehalfListFilterSchema>;
