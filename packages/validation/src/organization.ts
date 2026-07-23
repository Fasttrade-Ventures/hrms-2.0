import { z } from "zod";

export const weekendModeSchema = z.enum(["sat_sun", "fri_sat", "sun_only"]);

export const createBranchSchema = z.object({
  name: z.string().min(1).max(200),
  weekendMode: weekendModeSchema.default("sat_sun"),
  payrollCutoffDay: z.coerce.number().int().min(1).max(28).default(6),
});

export const updateBranchSchema = createBranchSchema;

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(200),
  branchId: z.string().uuid().optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema;

export const createShiftSchema = z.object({
  name: z.string().min(1).max(200),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM format"),
  graceMinutes: z.coerce.number().int().min(0).max(180).default(0),
});

export const updateShiftSchema = createShiftSchema;

export const createHolidaySchema = z.object({
  name: z.string().min(1).max(200),
  holidayDate: z.string().date(),
  branchId: z.string().uuid().optional().nullable(),
});

export const updateHolidaySchema = createHolidaySchema;

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1).max(200),
  entitlementDays: z.coerce.number().min(0).max(365).default(0),
  requiresAttachment: z.boolean().default(false),
  isUnpaid: z.boolean().default(false),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema;

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
