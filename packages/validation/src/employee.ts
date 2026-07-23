import { z } from "zod";

export const employeeStatusSchema = z.enum(["active", "inactive", "terminated"]);

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  employeeNumber: z.string().min(1).max(50).optional(),
  branchId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  managerEmployeeId: z.string().uuid().optional().nullable(),
  joinDate: z.string().date(),
  sendActivationEmail: z.boolean().default(true),
});

export const listEmployeesSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.union([employeeStatusSchema, z.literal("all")]).default("active"),
});

export const updateEmployeeCoreSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  branchId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
  joinDate: z.string().date().optional(),
  status: employeeStatusSchema.optional(),
});

export const updateEmployeePersonalSchema = z.object({
  phone: z.string().max(50).nullable().optional(),
  icNumber: z.string().max(50).nullable().optional(),
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
});

export const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().max(100).optional(),
  phone: z.string().min(1).max(50),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type ListEmployeesInput = z.infer<typeof listEmployeesSchema>;
export type UpdateEmployeeCoreInput = z.infer<typeof updateEmployeeCoreSchema>;
export type UpdateEmployeePersonalInput = z.infer<typeof updateEmployeePersonalSchema>;
export type UpdateEmployeeAddressInput = z.infer<typeof updateEmployeeAddressSchema>;
export type UpdateEmployeeBankInput = z.infer<typeof updateEmployeeBankSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
