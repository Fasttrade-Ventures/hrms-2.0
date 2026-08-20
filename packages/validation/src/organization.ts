import { z } from "zod";

export const HOLIDAY_YEAR_WINDOW = 2;

export const MALAYSIAN_STATE_VALUES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
] as const;

const malaysianStateSchema = z.enum(MALAYSIAN_STATE_VALUES);

const optionalMalaysianStateSchema = z
  .union([malaysianStateSchema, z.literal("")])
  .optional()
  .transform((value) => (value ? value : null));

function isHolidayYearAllowed(year: number) {
  const currentYear = new Date().getFullYear();
  return year >= currentYear - HOLIDAY_YEAR_WINDOW && year <= currentYear + HOLIDAY_YEAR_WINDOW;
}

const holidayDateSchema = z
  .string()
  .date()
  .refine((date) => isHolidayYearAllowed(Number(date.slice(0, 4))), {
    message: `Holiday date must be within the current year ±${HOLIDAY_YEAR_WINDOW} years.`,
  });

export const weekendModeSchema = z.enum(["sat_sun", "fri_sat", "sun_only"]);

export const epfWageRoundingSchema = z.enum(["none", "ceil_rm50"]);

export const createBranchSchema = z.object({
  name: z.string().min(1).max(200),
  state: optionalMalaysianStateSchema,
  weekendMode: weekendModeSchema.default("sat_sun"),
  payrollCutoffDay: z.coerce.number().int().min(1).max(28).default(6),
  hrdfEnabled: z.coerce.boolean().default(false),
  hrdfRegistrationNumber: z
    .string()
    .max(50)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  hrdfRatePercent: z.coerce.number().min(0).max(100).default(1),
  lindungEnabled: z.coerce.boolean().default(false),
  epfEmployerNumber: z
    .string()
    .max(50)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  socsoEmployerCode: z
    .string()
    .max(50)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  epfWageRounding: epfWageRoundingSchema.default("none"),
  lindungEmployerRatePercent: z.coerce.number().min(0).max(100).optional(),
  geofenceEnabled: z.coerce.boolean().default(false),
  latitude: z
    .union([z.coerce.number().min(-90).max(90), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value == null ? null : value)),
  longitude: z
    .union([z.coerce.number().min(-180).max(180), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value == null ? null : value)),
  geofenceRadiusM: z.coerce.number().int().min(25).max(5000).default(100),
  geofenceOutsideAction: z.enum(["flag", "block"]).default("flag"),
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
  holidayDate: holidayDateSchema,
  branchId: z.string().uuid().optional().nullable(),
});

export const updateHolidaySchema = createHolidaySchema;

export const importHolidaysSchema = z.object({
  branchId: z.string().uuid(),
  year: z.coerce
    .number()
    .int()
    .refine(isHolidayYearAllowed, {
      message: `Import year must be within the current year ±${HOLIDAY_YEAR_WINDOW} years.`,
    }),
});

export const listHolidaysSchema = z.object({
  year: z.coerce.number().int(),
  branchId: z.string().default("all"),
  sort: z.enum(["date", "name", "scope", "created"]).default("date"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1).max(200),
  entitlementDays: z.coerce.number().min(0).max(365).default(0),
  requiresAttachment: z.boolean().default(false),
  isUnpaid: z.boolean().default(false),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema;

export const createRosterEntrySchema = z.object({
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().nullable(),
});

export const reportScheduleSchema = z.enum(["daily", "weekly", "monthly"]);

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
export type ImportHolidaysInput = z.infer<typeof importHolidaysSchema>;
export type ListHolidaysInput = z.infer<typeof listHolidaysSchema>;
