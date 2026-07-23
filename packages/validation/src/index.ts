import { z } from "zod";

export const deploymentModeSchema = z.enum(["standalone", "saas"]);

export const systemRoleSchema = z.enum([
  "employee",
  "manager",
  "branch_admin",
  "hr_administrator",
  "director",
  "organization_owner",
  "platform_administrator",
]);

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  employeeNumber: z.string().min(1).max(50),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  joinDate: z.string().date(),
  sendActivationEmail: z.boolean().default(false),
});

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  halfDay: z.boolean().default(false),
  reason: z.string().max(2000).optional(),
});

export const claimRequestSchema = z.object({
  claimTypeId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  receiptDate: z.string().date(),
  description: z.string().max(2000).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type ClaimRequestInput = z.infer<typeof claimRequestSchema>;

export type DeploymentModeInput = z.infer<typeof deploymentModeSchema>;
