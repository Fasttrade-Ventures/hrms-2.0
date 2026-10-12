import { z } from "zod";

export const applyBehalfLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  halfDay: z.boolean().default(false),
  reason: z.string().max(2000).optional(),
  overrideReason: z.string().max(2000).optional(),
});

export const applyBehalfLateSchema = z.object({
  employeeId: z.string().uuid(),
  requestDate: z.string().date(),
  actualArrivalTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM format"),
  reason: z.string().max(2000).optional(),
});

export const applyBehalfClaimSchema = z.object({
  employeeId: z.string().uuid(),
  claimTypeId: z.string().uuid(),
  amount: z.string().min(1, "Amount is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  receiptDate: z.string().date(),
  description: z.string().max(2000).optional(),
  isMileage: z.boolean().default(false),
  distanceKm: z.string().optional(),
  ratePerKm: z.string().optional(),
  origin: z.string().max(255).optional(),
  destination: z.string().max(255).optional(),
  attachmentFileId: z.string().uuid().optional(),
});

export const applyBehalfOvertimeSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: z.string().date(),
  hours: z.string().min(1, "Hours are required").regex(/^\d+(\.\d{1,2})?$/, "Invalid hours format"),
  rateType: z.enum(["1.5", "2.0", "3.0"]),
  reason: z.string().max(2000).optional(),
});

export const applyBehalfReplacementCreditSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: z.string().date(),
  creditDays: z.string().min(1, "Credit days are required").regex(/^\d+(\.\d{1,2})?$/, "Invalid days format"),
  description: z.string().max(2000).optional(),
});

export const applyBehalfListFilterSchema = z.object({
  type: z.enum(["all", "leave", "late", "claim", "overtime", "replacement"]).default("all"),
  dateFrom: z
    .union([z.string().date(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  dateTo: z
    .union([z.string().date(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export type ApplyBehalfLeaveInput = z.infer<typeof applyBehalfLeaveSchema>;
export type ApplyBehalfLateInput = z.infer<typeof applyBehalfLateSchema>;
export type ApplyBehalfClaimInput = z.infer<typeof applyBehalfClaimSchema>;
export type ApplyBehalfOvertimeInput = z.infer<typeof applyBehalfOvertimeSchema>;
export type ApplyBehalfReplacementCreditInput = z.infer<typeof applyBehalfReplacementCreditSchema>;
export type ApplyBehalfListFilter = z.infer<typeof applyBehalfListFilterSchema>;
