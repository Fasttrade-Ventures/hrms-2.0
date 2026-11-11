import { z } from "zod";

export const recruitmentStageSchema = z.enum([
  "applied",
  "screening",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
]);

export const createRequisitionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  headcount: z.coerce.number().int().min(1).max(99).default(1),
  departmentId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).optional().nullable(),
});

export const updateRequisitionSchema = createRequisitionSchema.extend({
  requisitionId: z.string().uuid(),
});

export const requisitionStatusSchema = z.enum(["open", "on_hold", "closed"]);

export const setRequisitionStatusSchema = z.object({
  requisitionId: z.string().uuid(),
  status: requisitionStatusSchema,
});

export const addCandidateSchema = z.object({
  requisitionId: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

export const moveStageSchema = z.object({
  applicationId: z.string().uuid(),
  toStage: recruitmentStageSchema,
  notes: z.string().max(2000).optional(),
});

export const createOfferSchema = z.object({
  applicationId: z.string().uuid(),
  jobTitle: z.string().min(1).max(200),
  basicSalary: z.coerce.number().min(0),
  startDate: z.string().date(),
});

export const offerLifecycleStatusSchema = z.enum(["sent", "declined", "withdrawn"]);

export const setOfferStatusSchema = z.object({
  offerId: z.string().uuid(),
  status: offerLifecycleStatusSchema,
});

export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;
export type UpdateRequisitionInput = z.infer<typeof updateRequisitionSchema>;
export type SetRequisitionStatusInput = z.infer<typeof setRequisitionStatusSchema>;
export type AddCandidateInput = z.infer<typeof addCandidateSchema>;
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type SetOfferStatusInput = z.infer<typeof setOfferStatusSchema>;
