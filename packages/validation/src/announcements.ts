import { z } from "zod";

export const announcementTargetRoleSchema = z.enum(["employee", "manager"]);

export const announcementPublishModeSchema = z.enum(["draft", "publish_now", "schedule"]);

export const announcementFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    body: z.string().trim().min(1, "Message is required."),
    publishMode: announcementPublishModeSchema,
    branchId: z.string().uuid().optional().nullable(),
    targetRoles: z.array(announcementTargetRoleSchema).default([]),
    targetDepartmentIds: z.array(z.string().uuid()).default([]),
    displayFrom: z.string().date().optional().nullable(),
    displayUntil: z.string().date().optional().nullable(),
    isPinned: z.coerce.boolean().default(false),
    removeAttachment: z.coerce.boolean().default(false),
    removeAttachmentIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.publishMode === "schedule" && !value.displayFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is required when scheduling.",
        path: ["displayFrom"],
      });
    }

    if (value.displayFrom && value.displayUntil && value.displayUntil < value.displayFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date.",
        path: ["displayUntil"],
      });
    }
  });

export type AnnouncementFormInput = z.infer<typeof announcementFormSchema>;
export type AnnouncementPublishMode = z.infer<typeof announcementPublishModeSchema>;
