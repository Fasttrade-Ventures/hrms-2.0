import { z } from "zod";

export const employeeStatusSchema = z.enum(["active", "inactive", "terminated"]);

const optionalUuid = z.string().uuid().optional().nullable();
const optionalText = z.string().max(200).optional().nullable();
const optionalDate = z.string().date().optional().nullable();

export const employmentTypeSchema = z.enum(["full_time", "part_time", "contract", "intern"]);
export const confirmationStatusSchema = z.enum(["probation", "confirmed", "contract"]);
export const genderSchema = z.enum(["male", "female", "other", "prefer_not_to_say"]);
export const maritalStatusSchema = z.enum(["single", "married", "divorced", "widowed"]);
export const payBasisSchema = z.enum(["monthly", "daily", "hourly"]);

export const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().max(100).optional(),
  phone: z.string().min(1).max(50),
});

export const dependentSchema = z.object({
  dependentType: z.enum(["spouse", "child"]),
  fullName: z.string().min(1).max(200),
  icNumber: z.string().max(50).optional().nullable(),
  isWorking: z.boolean().optional().nullable(),
  dateOfBirth: optionalDate,
});

export const createEmployeeSchema = z.object({
  // Employment
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  employeeNumber: z.string().min(1).max(50).optional(),
  joinDate: z.string().date(),
  employmentType: employmentTypeSchema.optional().nullable(),
  jobTitle: optionalText,
  confirmationStatus: confirmationStatusSchema.optional().nullable(),
  branchId: optionalUuid,
  departmentId: optionalUuid,
  managerEmployeeId: optionalUuid,
  payGroupId: optionalUuid,
  shiftId: optionalUuid,
  annualLeaveEntitlement: z.coerce.number().min(0).max(365).optional(),
  annualLeaveCarryForward: z.coerce.number().min(0).max(365).optional(),
  allowedLeaveTypeIds: z.array(z.string().uuid()).optional(),
  portalRole: z.enum(["employee", "manager", "hr_administrator"]).default("employee"),
  sendActivationEmail: z.boolean().default(true),

  // Personal & bank
  phone: optionalText,
  icNumber: optionalText,
  dateOfBirth: optionalDate,
  gender: genderSchema.optional().nullable(),
  race: optionalText,
  religion: optionalText,
  maritalStatus: maritalStatusSchema.optional().nullable(),
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  state: optionalText,
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  payBasis: payBasisSchema.optional().nullable(),
  workingDaysPerMonth: z.coerce.number().min(1).max(31).optional(),
  basicSalary: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  bankName: optionalText,
  bankAccountNumber: optionalText,
  epfNumber: optionalText,
  socsoNumber: optionalText,
  taxNumber: optionalText,
  epfEmployeeRate: z.coerce.number().min(0).max(100).optional(),
  epfEmployerRate: z.coerce.number().min(0).max(100).optional(),
  eisEligible: z.boolean().optional(),
  voluntaryEpfExtraRate: z.coerce.number().min(0).max(100).optional(),
  profilePhotoPath: optionalText,
  removeProfilePhoto: z.boolean().optional(),

  // Family
  dependents: z.array(dependentSchema).optional(),

  // Emergency
  emergencyContacts: z.array(emergencyContactSchema).optional(),
});

export const listEmployeesSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.union([employeeStatusSchema, z.literal("all")]).default("active"),
  branchId: z.union([z.string().uuid(), z.literal("all")]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const updateEmployeeCoreSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  branchId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
  joinDate: z.string().date().optional(),
  status: employeeStatusSchema.optional(),
  employmentType: employmentTypeSchema.nullable().optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  confirmationStatus: confirmationStatusSchema.nullable().optional(),
  payGroupId: z.string().uuid().nullable().optional(),
  shiftId: z.string().uuid().nullable().optional(),
  annualLeaveEntitlement: z.coerce.number().min(0).max(365).optional(),
  annualLeaveCarryForward: z.coerce.number().min(0).max(365).optional(),
});

export const updateEmployeePersonalSchema = z.object({
  phone: z.string().max(50).nullable().optional(),
  icNumber: z.string().max(50).nullable().optional(),
  dateOfBirth: optionalDate,
  gender: genderSchema.nullable().optional(),
  race: optionalText,
  religion: optionalText,
  maritalStatus: maritalStatusSchema.nullable().optional(),
});

export const updateEmployeeAddressSchema = z.object({
  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  postcode: z.string().max(20).nullable().optional(),
  country: z.string().max(2).nullable().optional(),
});

export const updateEmployeeBankSchema = z.object({
  bankName: z.string().max(100).nullable().optional(),
  bankAccountNumber: z.string().max(50).nullable().optional(),
  epfNumber: z.string().max(50).nullable().optional(),
  socsoNumber: z.string().max(50).nullable().optional(),
  taxNumber: z.string().max(50).nullable().optional(),
  basicSalary: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  payBasis: payBasisSchema.nullable().optional(),
  workingDaysPerMonth: z.coerce.number().min(1).max(31).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type ListEmployeesInput = z.infer<typeof listEmployeesSchema>;
export type UpdateEmployeeCoreInput = z.infer<typeof updateEmployeeCoreSchema>;
export type UpdateEmployeePersonalInput = z.infer<typeof updateEmployeePersonalSchema>;
export type UpdateEmployeeAddressInput = z.infer<typeof updateEmployeeAddressSchema>;
export type UpdateEmployeeBankInput = z.infer<typeof updateEmployeeBankSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type DependentInput = z.infer<typeof dependentSchema>;
