import { z } from "zod";

export const assetStatusSchema = z.enum(["available", "assigned", "returned", "disposed"]);
export const assetConditionSchema = z.enum(["new", "good", "fair", "poor", "damaged"]);
export const assetRequestKindSchema = z.enum(["issue", "return", "replacement"]);
export const returnDestinationSchema = z.enum(["to_inventory", "pending_inspection"]);

export const assetCategoryFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase snake_case keys"),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "number", "date", "select"]),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1)).optional(),
});

export const createAssetCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  fieldSchema: z.array(assetCategoryFieldSchema).default([]),
});

export const updateAssetCategorySchema = createAssetCategorySchema;

const optionalUuidSchema = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalDateSchema = z
  .union([z.string().date(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalMoneySchema = z
  .union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
  serialNumber: z.string().max(120).optional().nullable(),
  branchId: optionalUuidSchema,
  condition: z.union([assetConditionSchema, z.literal(""), z.null()]).optional().transform((value) => (value ? value : null)),
  notes: z.string().max(5000).optional().nullable(),
  purchaseDate: optionalDateSchema,
  purchaseValue: optionalMoneySchema,
  warrantyExpiresOn: optionalDateSchema,
  customValuesJson: z.string().optional().default("{}"),
  assignedEmployeeId: optionalUuidSchema,
  issuedAt: optionalDateSchema,
});

export const updateAssetSchema = createAssetSchema.omit({
  assignedEmployeeId: true,
  issuedAt: true,
});

export const assignAssetSchema = z.object({
  assetId: z.string().uuid(),
  employeeId: z.string().uuid(),
  assignedAt: z.string().date(),
  notes: z.string().max(2000).optional().nullable(),
});

export const returnAssetSchema = z.object({
  assignmentId: z.string().uuid(),
  returnedAt: z.string().date(),
  destination: returnDestinationSchema,
  notes: z.string().max(2000).optional().nullable(),
});

export const assetRequestSchema = z.object({
  assetId: z.string().uuid(),
  kind: assetRequestKindSchema,
  message: z.string().max(2000).optional().nullable(),
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
export type AssetRequestInput = z.infer<typeof assetRequestSchema>;
