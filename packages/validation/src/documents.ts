import { z } from "zod";

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const optionalFilterUuid = z
  .union([z.string().uuid(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalFilterString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const documentLibraryFiltersSchema = z.object({
  search: optionalFilterString,
  employeeId: optionalFilterUuid,
  documentType: optionalFilterString,
  folderId: optionalFilterUuid,
  status: z.enum(["all", "expiring", "expired", "no_expiry"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});

export const uploadDocumentSchema = z.object({
  employeeId: z.string().uuid(),
  documentType: z.string().trim().min(1).max(200),
  folderId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().date().optional().nullable(),
});

export const requiredDocumentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional().nullable(),
  requiresExpiry: z.coerce.boolean().default(true),
  warningDays: z.coerce.number().int().min(1).max(365).default(30),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const folderAccessRoleSchema = z.enum(["hr_administrator", "employee", "manager"]);

export const documentFolderSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z.string().uuid().optional().nullable(),
  accessRoles: z.array(folderAccessRoleSchema).min(1).default(["hr_administrator", "employee"]),
});

export type DocumentLibraryFilters = z.infer<typeof documentLibraryFiltersSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type RequiredDocumentInput = z.infer<typeof requiredDocumentSchema>;
export type DocumentFolderInput = z.infer<typeof documentFolderSchema>;
