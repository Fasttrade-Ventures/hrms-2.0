# Documents Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full Documents module — R2 storage, signed downloads, HR hub with library/folders/required rules/compliance, and employee vault with downloads.

**Architecture:** Hub + sub-routes under `/hr/documents/*` matching the Organization module. Shared lib layer in `lib/hr/documents.ts` + `document-compliance.ts`. Download via authenticated API route that issues short-lived R2 signed URLs.

**Tech Stack:** Next.js App Router, Supabase PostgreSQL + RLS, Cloudflare R2 via `@aws-sdk/client-s3`, Zod (`@hrms/validation`), shadcn/ui (`Card`, `Dialog`, `Badge`, `Button`, `ToggleGroup`).

## Global Constraints

- Tenant isolation: every query filters by `organization_id`; RLS policies must not be bypassed except via `createAdminClient()` for file metadata writes.
- Files: private R2 objects only; never expose permanent URLs; signed URL TTL = **300 seconds**.
- Auth: HR routes use `requireRole("hr_administrator")`; employee routes use `requireEmployeeContext()`; all document routes call `requireModule("documents")`.
- UI: follow shadcn patterns from `components/hr/hr-ui.tsx`, `hr-ui.client.tsx`, and Organization hub — no legacy `ListCard` for new screens.
- Validation: Zod schemas in `packages/validation/src/documents.ts`; parse in server actions.
- Do not invent Pencil designs; use existing HR list/hub patterns until Pencil `HR Admin / Documents` is finalized.
- `DEPLOYMENT_MODE=standalone`: `DEFAULT_ORGANIZATION_ID` env for org scope.

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/platform/src/storage/s3-r2.ts` | Real R2 adapter |
| `packages/platform/src/storage/r2.ts` | Interface + stub (existing) |
| `apps/web/src/lib/files/storage.ts` | Adapter selection, upload, soft delete |
| `apps/web/src/app/api/files/[fileId]/download/route.ts` | Auth + signed URL redirect |
| `supabase/migrations/20260724180000_required_documents.sql` | New table + RLS |
| `packages/validation/src/documents.ts` | Zod schemas |
| `apps/web/src/lib/hr/document-compliance.ts` | Pure compliance status logic |
| `apps/web/src/lib/hr/document-folders.ts` | Folder CRUD queries |
| `apps/web/src/lib/hr/documents.ts` | Document list/filter/upload helpers (expand) |
| `apps/web/src/app/(hr)/hr/documents/actions.ts` | Server actions |
| `apps/web/src/components/hr/documents/*.tsx` | UI components |
| `tests/integration/documents-compliance.test.ts` | Compliance logic tests |

---

### Task 1: R2 adapter + download API + soft delete

**Files:**
- Create: `packages/platform/src/storage/s3-r2.ts`
- Modify: `packages/platform/src/index.ts`
- Modify: `apps/web/src/lib/files/storage.ts`
- Create: `apps/web/src/app/api/files/[fileId]/download/route.ts`
- Create: `apps/web/src/lib/files/download-auth.ts`

**Interfaces:**
- Produces: `S3R2StorageAdapter` implementing `R2StorageAdapter`
- Produces: `createStorageAdapter(): R2StorageAdapter` in `storage.ts`
- Produces: `softDeleteFile(fileId: string): Promise<void>` in `storage.ts`
- Produces: `canDownloadFile(userId, roles, employeeId, fileId): Promise<boolean>` in `download-auth.ts`

- [ ] **Step 1: Add S3R2StorageAdapter**

Create `packages/platform/src/storage/s3-r2.ts`:

```typescript
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  buildTenantObjectKey,
  type R2ObjectRef,
  type R2StorageAdapter,
  type R2UploadInput,
  type SignedUrlOptions,
} from "./r2";

export class S3R2StorageAdapter implements R2StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`;
    this.bucket = process.env.R2_BUCKET ?? "hrms-private";

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 credentials are not configured.");
    }

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  buildKey(input: Pick<R2UploadInput, "organizationId" | "category" | "fileName">): string {
    return buildTenantObjectKey(input.organizationId, input.category, input.fileName);
  }

  async putObject(input: R2UploadInput): Promise<R2ObjectRef> {
    const key = this.buildKey(input);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { bucket: this.bucket, key };
  }

  async getSignedDownloadUrl(ref: R2ObjectRef, options?: SignedUrlOptions): Promise<string> {
    const command = new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key });
    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresInSeconds ?? 300,
    });
  }

  async deleteObject(ref: R2ObjectRef): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
  }
}
```

Add to `packages/platform/package.json` dependencies if missing:
`"@aws-sdk/s3-request-presigner": "^3.750.0"`

Export from `packages/platform/src/index.ts`:
`export * from "./storage/s3-r2";`

- [ ] **Step 2: Adapter selection in storage.ts**

Modify `apps/web/src/lib/files/storage.ts`:

```typescript
import { S3R2StorageAdapter, StubR2StorageAdapter, type R2StorageAdapter } from "@hrms/platform";

function createStorageAdapter(): R2StorageAdapter {
  const hasR2 =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;
  if (hasR2) {
    try {
      return new S3R2StorageAdapter();
    } catch {
      return new StubR2StorageAdapter();
    }
  }
  return new StubR2StorageAdapter();
}

const adapter = createStorageAdapter();
```

Add `softDeleteFile`:

```typescript
export async function softDeleteFile(fileId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("file_objects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 3: Download authorization helper**

Create `apps/web/src/lib/files/download-auth.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function canDownloadFile(input: {
  userId: string;
  roles: string[];
  employeeId: string | null;
  fileId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data: file } = await admin
    .from("file_objects")
    .select("id, organization_id, deleted_at")
    .eq("id", input.fileId)
    .maybeSingle();

  if (!file || file.deleted_at) return false;

  if (input.roles.includes("hr_administrator")) return true;

  if (!input.employeeId) return false;

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("employee_documents")
    .select("id")
    .eq("file_id", input.fileId)
    .eq("employee_id", input.employeeId)
    .maybeSingle();

  return Boolean(link);
}
```

- [ ] **Step 4: Download API route**

Create `apps/web/src/app/api/files/[fileId]/download/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { canDownloadFile } from "@/lib/files/download-auth";
import { getSignedDownloadUrl } from "@/lib/files/storage";
import { getEmployeeIdForUser } from "@/lib/employee/context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeId = await getEmployeeIdForUser(session.user.id).catch(() => null);
  const allowed = await canDownloadFile({
    userId: session.user.id,
    roles: session.roles,
    employeeId,
    fileId,
  });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = await getSignedDownloadUrl(fileId);
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.redirect(url);
}
```

Implement `getEmployeeIdForUser` in `apps/web/src/lib/employee/context.ts` if it does not exist (query `employees` by `user_id`).

- [ ] **Step 5: Verify**

Run: `cd apps/web && pnpm typecheck`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/platform/src/storage/s3-r2.ts packages/platform/src/index.ts \
  apps/web/src/lib/files/storage.ts apps/web/src/lib/files/download-auth.ts \
  apps/web/src/app/api/files/\[fileId\]/download/route.ts
git commit -m "feat(documents): add R2 adapter and authenticated file download route"
```

---

### Task 2: Schema + validation

**Files:**
- Create: `supabase/migrations/20260724180000_required_documents.sql`
- Create: `packages/validation/src/documents.ts`
- Modify: `packages/validation/src/index.ts`

**Interfaces:**
- Produces: `uploadDocumentSchema`, `requiredDocumentSchema`, `documentFolderSchema`, `documentLibraryFiltersSchema`
- Produces: types `DocumentLibraryFilters`, `RequiredDocumentInput`, `DocumentFolderInput`

- [ ] **Step 1: Migration**

Create `supabase/migrations/20260724180000_required_documents.sql` per design spec §5.2. Include seed insert for default org if `DEFAULT_ORGANIZATION_ID` pattern is used elsewhere, or leave seeding to a separate org bootstrap script.

- [ ] **Step 2: Zod schemas**

Create `packages/validation/src/documents.ts`:

```typescript
import { z } from "zod";

export const documentLibraryFiltersSchema = z.object({
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  documentType: z.string().trim().optional(),
  folderId: z.string().uuid().optional(),
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

export const documentFolderSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z.string().uuid().optional().nullable(),
  accessRoles: z
    .array(z.enum(["hr_administrator", "employee", "manager"]))
    .min(1)
    .default(["hr_administrator", "employee"]),
});

export type DocumentLibraryFilters = z.infer<typeof documentLibraryFiltersSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type RequiredDocumentInput = z.infer<typeof requiredDocumentSchema>;
export type DocumentFolderInput = z.infer<typeof documentFolderSchema>;
```

Export from `packages/validation/src/index.ts`.

- [ ] **Step 3: Apply migration locally**

Run: `supabase db push` or project migration workflow  
Expected: `required_documents` table exists

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260724180000_required_documents.sql packages/validation/src/documents.ts packages/validation/src/index.ts
git commit -m "feat(documents): add required_documents schema and validation"
```

---

### Task 3: Lib layer — queries, folders, compliance

**Files:**
- Create: `apps/web/src/lib/hr/document-compliance.ts`
- Create: `apps/web/src/lib/hr/document-folders.ts`
- Modify: `apps/web/src/lib/hr/documents.ts`
- Create: `tests/integration/documents-compliance.test.ts`

**Interfaces:**
- Produces: `type ComplianceStatus = "valid" | "expiring" | "missing" | "expired"`
- Produces: `resolveDocumentCompliance(input): ComplianceStatus` (pure function)
- Produces: `listDocumentLibrary(filters: DocumentLibraryFilters)`
- Produces: `listRequiredDocuments()`, `listDocumentFolders()`, `getDocumentsHubStats()`

- [ ] **Step 1: Write failing compliance tests**

Create `tests/integration/documents-compliance.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { resolveDocumentCompliance } from "../../apps/web/src/lib/hr/document-compliance";

describe("resolveDocumentCompliance", () => {
  const required = { requiresExpiry: true, warningDays: 30 };
  const today = "2026-07-24";

  it("returns missing when no document", () => {
    expect(resolveDocumentCompliance({ required, document: null, today })).toBe("missing");
  });

  it("returns expired when past expiry", () => {
    expect(
      resolveDocumentCompliance({
        required,
        document: { expiresAt: "2026-07-01" },
        today,
      }),
    ).toBe("expired");
  });

  it("returns expiring within warning window", () => {
    expect(
      resolveDocumentCompliance({
        required,
        document: { expiresAt: "2026-08-01" },
        today,
      }),
    ).toBe("expiring");
  });

  it("returns valid when expiry is far out", () => {
    expect(
      resolveDocumentCompliance({
        required,
        document: { expiresAt: "2027-01-01" },
        today,
      }),
    ).toBe("valid");
  });

  it("returns valid when expiry not required and doc exists", () => {
    expect(
      resolveDocumentCompliance({
        required: { requiresExpiry: false, warningDays: 30 },
        document: { expiresAt: null },
        today,
      }),
    ).toBe("valid");
  });
});
```

- [ ] **Step 2: Implement document-compliance.ts**

```typescript
export type ComplianceStatus = "valid" | "expiring" | "missing" | "expired";

export function resolveDocumentCompliance(input: {
  required: { requiresExpiry: boolean; warningDays: number };
  document: { expiresAt: string | null } | null;
  today: string;
}): ComplianceStatus {
  if (!input.document) return "missing";
  if (!input.required.requiresExpiry) return "valid";
  if (!input.document.expiresAt) return "missing";

  const todayMs = Date.parse(`${input.today}T00:00:00Z`);
  const expiresMs = Date.parse(`${input.document.expiresAt}T00:00:00Z`);
  if (expiresMs < todayMs) return "expired";

  const warningMs = input.required.warningDays * 86_400_000;
  if (expiresMs - todayMs <= warningMs) return "expiring";

  return "valid";
}
```

- [ ] **Step 3: Expand documents.ts**

Add to `apps/web/src/lib/hr/documents.ts`:

- `listDocumentLibrary(filters)` — join employees, file_objects, folders; filter by status using date math
- `getDocumentsHubStats()` — counts: total docs, expiring 30d, missing compliance count, folder count
- `deleteEmployeeDocument(documentId)` — soft-delete file + optionally keep employee_documents row or delete link
- Update `listEmployeeDocuments` to exclude `deleted_at` files and include `fileId`, `folderId`

- [ ] **Step 4: document-folders.ts**

```typescript
export async function listDocumentFolders(): Promise<DocumentFolderRow[]>
export async function createDocumentFolder(input: DocumentFolderInput): Promise<void>
export async function updateDocumentFolder(id: string, input: DocumentFolderInput): Promise<void>
export async function deleteDocumentFolder(id: string): Promise<void>
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest tests/integration/documents-compliance.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/hr/document-compliance.ts apps/web/src/lib/hr/document-folders.ts \
  apps/web/src/lib/hr/documents.ts tests/integration/documents-compliance.test.ts
git commit -m "feat(documents): add compliance engine and document queries"
```

---

### Task 4: HR hub + library UI

**Files:**
- Create: `apps/web/src/app/(hr)/hr/documents/page.tsx` (replace)
- Create: `apps/web/src/app/(hr)/hr/documents/library/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/documents/actions.ts`
- Create: `apps/web/src/components/hr/documents/documents-hub.tsx`
- Create: `apps/web/src/components/hr/documents/document-library.tsx`
- Create: `apps/web/src/components/hr/documents/document-filters.tsx`
- Create: `apps/web/src/components/hr/documents/upload-document-dialog.tsx`
- Delete: `apps/web/src/components/hr/upload-document-form.tsx`
- Modify: `apps/web/src/app/(hr)/hr/actions.ts` (remove `uploadEmployeeDocumentAction`)

**Interfaces:**
- Consumes: `listDocumentLibrary`, `getDocumentsHubStats`, `uploadOrganizationFile`, `attachEmployeeDocument`, `softDeleteFile`
- Produces: `uploadDocumentAction`, `deleteDocumentAction` in `hr/documents/actions.ts`

- [ ] **Step 1: Move upload action**

Create `apps/web/src/app/(hr)/hr/documents/actions.ts` with `uploadDocumentAction` and `deleteDocumentAction`. Parse with `uploadDocumentSchema`. Support `folderId`. Revalidate `/hr/documents`, `/hr/documents/library`, `/employee/documents`.

- [ ] **Step 2: Documents hub**

`documents-hub.tsx` — four stat cards + four module cards linking to library, folders, required, compliance. Show 5 most recent uploads.

`page.tsx`:
```typescript
export default async function Page() {
  await requireRole("hr_administrator");
  const stats = await getDocumentsHubStats();
  return <DocumentsHub stats={stats} />;
}
```

- [ ] **Step 3: Library page + components**

`library/page.tsx` — parse `searchParams` with `documentLibraryFiltersSchema`, fetch `listDocumentLibrary`, pass to `DocumentLibrary`.

`document-library.tsx`:
- `HrTableCard` with columns: Employee, Type, File, Folder, Expires, Actions
- Download: `<a href={/api/files/${fileId}/download}>`
- Delete: `DeleteDocumentButton` client component with `ConfirmDialog`
- `UploadDocumentDialog` in header via `HrLinkButton` or `Button`

`document-filters.tsx` — single-row `Card` with search input, employee select, type select, folder select, status toggle (match `employee-directory-filters.tsx` pattern).

- [ ] **Step 4: Remove legacy**

Delete `upload-document-form.tsx`. Remove upload action from `hr/actions.ts`.

- [ ] **Step 5: Verify**

Run: `cd apps/web && pnpm typecheck`  
Manual: visit `/hr/documents` and `/hr/documents/library`, upload a file, download it.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(hr)/hr/documents/ apps/web/src/components/hr/documents/ \
  apps/web/src/components/hr/upload-document-form.tsx apps/web/src/app/(hr)/hr/actions.ts
git commit -m "feat(documents): add HR hub and library with shadcn UI"
```

---

### Task 5: Folders + required rules CRUD

**Files:**
- Create: `apps/web/src/app/(hr)/hr/documents/folders/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/documents/required/page.tsx`
- Create: `apps/web/src/components/hr/documents/folder-manager.tsx`
- Create: `apps/web/src/components/hr/documents/required-documents-manager.tsx`
- Modify: `apps/web/src/app/(hr)/hr/documents/actions.ts`

**Interfaces:**
- Produces: `createFolderAction`, `updateFolderAction`, `deleteFolderAction`
- Produces: `createRequiredDocumentAction`, `updateRequiredDocumentAction`, `deleteRequiredDocumentAction`
- Produces: `listRequiredDocuments()` in `documents.ts`

- [ ] **Step 1: Required documents queries + actions**

Add `listRequiredDocuments`, `createRequiredDocument`, `updateRequiredDocument`, `deleteRequiredDocument` to lib + actions.

- [ ] **Step 2: Folder manager UI**

`folder-manager.tsx` — flat list with parent name, role badges, edit/delete dialogs. Checkbox group for `access_roles`.

- [ ] **Step 3: Required documents manager UI**

`required-documents-manager.tsx` — table with name, requires expiry, warning days, active toggle, sort order. Inline or dialog edit.

- [ ] **Step 4: Pages**

`folders/page.tsx` and `required/page.tsx` with `PortalPageHeader` + `HrLinkButton` back to hub.

- [ ] **Step 5: Wire upload dialog**

Update `upload-document-dialog.tsx` to load folders + required types as dropdown options.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(hr)/hr/documents/folders/ apps/web/src/app/(hr)/hr/documents/required/ \
  apps/web/src/components/hr/documents/folder-manager.tsx \
  apps/web/src/components/hr/documents/required-documents-manager.tsx
git commit -m "feat(documents): add folder and required document management"
```

---

### Task 6: Compliance matrix + employee portal + profile + dashboard

**Files:**
- Create: `apps/web/src/app/(hr)/hr/documents/compliance/page.tsx`
- Create: `apps/web/src/components/hr/documents/compliance-matrix.tsx`
- Create: `apps/web/src/components/hr/documents/employee-documents-section.tsx`
- Modify: `apps/web/src/app/(employee)/employee/documents/page.tsx`
- Modify: `apps/web/src/lib/employee/catalog.ts`
- Modify: `apps/web/src/lib/hr/dashboard.ts`
- Modify: `apps/web/src/app/(hr)/hr/employees/[employeeId]/page.tsx` (or profile view component)

**Interfaces:**
- Produces: `buildComplianceMatrix(): Promise<ComplianceMatrixRow[]>`
- Produces: `listMyDocuments()` returns `fileId` for download links

- [ ] **Step 1: Compliance matrix query**

Add `buildComplianceMatrix()` to `document-compliance.ts` — cross-product of active employees × active required docs, resolve status per cell.

- [ ] **Step 2: Compliance page**

`compliance-matrix.tsx` — table: Employee | required type columns or long format (Employee, Document, Status, Expires). Use `HrStatusBadge` or `Badge` variants: valid=secondary, expiring=outline, missing/expired=destructive.

- [ ] **Step 3: Employee portal**

Update `listMyDocuments()` to join `file_objects` for `file_name`, respect folder ACL for employees.

Update `employee/documents/page.tsx`:
- shadcn `HrTableCard`
- Download button per row
- Compliance summary banner at top (X missing, Y expiring)

- [ ] **Step 4: Employee profile section**

`employee-documents-section.tsx` — mini table on employee view page with link to `/hr/documents/library?employeeId=...` and upload dialog pre-filled.

- [ ] **Step 5: Dashboard widget**

Update `dashboard.ts` compliance watch to use `buildComplianceMatrix` summary counts instead of raw expiry query only.

- [ ] **Step 6: Smoke test**

Update `docs/smoke-test-results.md` with documents checklist from design spec §12.

Run: `cd apps/web && pnpm typecheck && pnpm vitest tests/integration/documents-compliance.test.ts`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(hr)/hr/documents/compliance/ apps/web/src/components/hr/documents/compliance-matrix.tsx \
  apps/web/src/components/hr/documents/employee-documents-section.tsx \
  apps/web/src/app/(employee)/employee/documents/page.tsx apps/web/src/lib/employee/catalog.ts \
  apps/web/src/lib/hr/dashboard.ts docs/smoke-test-results.md
git commit -m "feat(documents): add compliance matrix, employee vault, and dashboard integration"
```

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| R2 adapter + signed download | Task 1 |
| Soft delete | Task 1 |
| `required_documents` migration | Task 2 |
| Zod validation | Task 2 |
| Hub + sub-routes | Tasks 4–6 |
| Library filters | Task 4 |
| Folders CRUD + ACL | Task 5 |
| Required rules CRUD | Task 5 |
| Compliance matrix | Task 6 |
| Employee download | Tasks 1, 6 |
| Employee profile section | Task 6 |
| Dashboard integration | Task 6 |
| shadcn UI | Tasks 4–6 |
| Exit criteria tests | Tasks 3, 6 |

No placeholders remain. Type names consistent: `ComplianceStatus`, `DocumentLibraryFilters`, `resolveDocumentCompliance`.

---

## Execution handoff

**Plan saved to `docs/superpowers/plans/2026-07-24-documents-module.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach do you want?
