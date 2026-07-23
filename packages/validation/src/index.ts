import { z } from "zod";

export * from "./employee";

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

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type ClaimRequestInput = z.infer<typeof claimRequestSchema>;
export type DeploymentModeInput = z.infer<typeof deploymentModeSchema>;
