# Documents Module — Design Spec

**Date:** 24 Jul 2026  
**Status:** Approved  
**Scope:** Full module (Core MVP + compliance + folders)  
**Related:** [development-phases.md](../../development-phases.md) Phase 6 + Phase 8 · [features.md](../../features.md) §9

---

## 1. Summary

Complete the HRMS **Documents** module so HR can upload, organize, and govern employee files with real Cloudflare R2 storage, while employees can view and download their own documents. The module adds folder ACLs, required-document rules, and a compliance matrix.

**Architecture choice:** Hub + sub-routes (matches Organization module pattern).

---

## 2. Goals

### HR Administrator

- Upload files and attach them to employee records
- Browse, filter, download, and soft-delete documents
- Organize documents in folders with role-based visibility
- Define required document types per organization
- View compliance status (missing / expiring / valid) per employee
- Access documents from the employee profile page

### Employee

- View and download documents shared by HR
- See which required documents are missing or expiring soon

### Platform

- Real R2 storage in production; stub adapter in local dev when `R2_*` env vars are unset
- Signed download URLs (5-minute TTL)
- Strict tenant isolation via RLS + server-side auth checks

---

## 3. Non-goals (v1)

- Generated documents (offer letters, certificates) — Pro tier, later
- Employee self-upload — HR uploads only in v1
- Manager document access
- Bulk ZIP export
- Expiry email/in-app notifications (schema hooks only; send in follow-up)
- Legacy import reconciliation for documents (Phase 11)

---

## 4. Current state

| Area | Status |
|------|--------|
| `file_objects`, `employee_documents`, `document_folders` tables | ✅ Migrated |
| `required_documents` table | ❌ Not migrated |
| HR `/hr/documents` upload + metadata list | 🟡 Scaffold only |
| Employee `/employee/documents` read-only list | 🟡 No download |
| `getSignedDownloadUrl()` helper | ✅ Exists, unused in UI |
| `StubR2StorageAdapter` | ✅ Default; no real R2 |
| Folders UI / queries | ❌ |
| Compliance engine | ❌ (dashboard reads raw `expires_at` only) |
| shadcn UI polish | ❌ Legacy `ListCard` |

---

## 5. Data model

### 5.1 Existing tables (unchanged)

**`file_objects`** — binary metadata (R2 key, bucket, sha256, soft-delete via `deleted_at`)

**`employee_documents`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK |
| `employee_id` | uuid | FK → employees |
| `folder_id` | uuid | FK → document_folders, nullable |
| `document_type` | text | Matches required doc name or custom |
| `file_id` | uuid | FK → file_objects |
| `expires_at` | date | nullable |
| `created_at` | timestamptz | |

**`document_folders`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK |
| `name` | text | |
| `parent_id` | uuid | Self-ref, nullable |
| `access_roles` | text[] | e.g. `['hr_administrator', 'employee']` |
| `created_at` | timestamptz | |

### 5.2 New table — `required_documents`

```sql
create table public.required_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  requires_expiry boolean not null default true,
  warning_days integer not null default 30,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.required_documents enable row level security;

create policy required_documents_org on public.required_documents
  for all using (organization_id in (select public.current_user_org_ids()));
```

**Seed (per org, optional migration seed):** NRIC copy, Passport, Offer letter, Employment contract, EPF registration.

### 5.3 Document type matching

- `employee_documents.document_type` matches `required_documents.name` using case-insensitive trim.
- Upload form dropdown: active required types + "Other (custom)" free-text field.
- Compliance uses the **latest** `employee_documents` row per employee + type (by `created_at`).

### 5.4 Compliance status rules

For each **active** employee and each **active** required document:

| Condition | Status |
|-----------|--------|
| No matching document | `missing` |
| `expires_at` < today | `expired` (treated as `missing` in UI) |
| `expires_at` within `warning_days` | `expiring` |
| Valid document on file | `valid` |
| `requires_expiry = false` and doc exists | `valid` |

---

## 6. Routes & information architecture

```text
HR Administrator
├── /hr/documents                    Hub — stats, module cards, recent uploads
├── /hr/documents/library            Table + filters + upload dialog
├── /hr/documents/folders            Folder tree CRUD + role ACL
├── /hr/documents/required           Required document rules CRUD
└── /hr/documents/compliance         Employee × required type matrix

Employee
└── /employee/documents              List + download + compliance badges

API
└── GET /api/files/[fileId]/download Signed URL redirect (300s TTL)
```

**Employee profile:** `/hr/employees/[id]` gains a Documents section linking to library filtered by employee + inline upload.

**Nav:** Existing `portal-nav.ts` entries unchanged (`/hr/documents`, `/employee/documents`). Hub replaces flat list as default landing.

---

## 7. Storage & security

### 7.1 R2 adapter

- New `S3R2StorageAdapter` in `packages/platform/src/storage/s3-r2.ts` using `@aws-sdk/client-s3`.
- Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`.
- `apps/web/src/lib/files/storage.ts` selects adapter: real when env complete, else `StubR2StorageAdapter`.

### 7.2 Download authorization

`GET /api/files/[fileId]/download`:

1. Resolve session + org membership
2. Load `file_objects` + linked `employee_documents` (if category is employee-documents)
3. **HR admin:** any org document
4. **Employee:** only where `employee_id` matches current user's employee record
5. Generate signed URL → `302` redirect
6. Return `403` / `404` on failure (no URL leakage)

### 7.3 Soft delete

- Set `file_objects.deleted_at = now()` on HR delete action
- Hide from all list queries (`deleted_at is null`)
- R2 object delete: best-effort async (or orphan cleanup job later)

### 7.4 Folder ACL

`document_folders.access_roles` controls visibility:

| Role in array | Effect |
|---------------|--------|
| `hr_administrator` | HR sees folder in library + compliance |
| `employee` | Employee portal shows docs in this folder |
| `manager` | Not enforced in v1 |

Employees always see only their own documents; folder ACL filters which folders appear.

---

## 8. UI design (shadcn)

Follow patterns from Employees, Organization, Apply on Behalf:

| Screen | Components |
|--------|------------|
| Hub | `HrStatCards`, module `Card` links, recent uploads table |
| Library | `HrTableCard`, `HrPagination`, filter `Card`, upload `Dialog` |
| Folders | Tree list in `Card`, create/edit `Dialog` with role checkboxes |
| Required rules | `HrTableCard` + form `Dialog` |
| Compliance | Matrix table with `Badge` status pills |
| Employee portal | `HrTableCard` + download link button |

**Library filters:** search (employee name, file name, type), employee, document type, folder, status (`all` / `expiring` / `expired` / `no_expiry`).

**Row actions:** Download, Delete (destructive confirm dialog).

**Remove legacy:** `upload-document-form.tsx` (replaced by dialog); move upload action from `hr/actions.ts` to `hr/documents/actions.ts`.

---

## 9. Code structure

```text
apps/web/src/
  app/(hr)/hr/documents/
    page.tsx
    library/page.tsx
    folders/page.tsx
    required/page.tsx
    compliance/page.tsx
    actions.ts
  app/api/files/[fileId]/download/route.ts
  components/hr/documents/
    documents-hub.tsx
    document-library.tsx
    document-filters.tsx
    upload-document-dialog.tsx
    folder-manager.tsx
    required-documents-manager.tsx
    compliance-matrix.tsx
    employee-documents-section.tsx
  lib/hr/documents.ts
  lib/hr/document-compliance.ts
  lib/hr/document-folders.ts
  lib/files/storage.ts

packages/platform/src/storage/s3-r2.ts
packages/validation/src/documents.ts

supabase/migrations/20260724180000_required_documents.sql

tests/integration/documents-compliance.test.ts
```

---

## 10. Dashboard integration

Update `apps/web/src/lib/hr/dashboard.ts`:

- Compliance watch widget uses `document-compliance.ts` for expiring + missing counts
- Link compliance items to `/hr/documents/compliance` and filtered library

---

## 11. Entitlements

- Module key: `documents` (already in `CORE_MODULES`)
- All routes call `requireModule("documents")` in addition to role checks

---

## 12. Exit criteria

- [ ] HR uploads PDF → appears in library → download works via signed URL
- [ ] HR deletes doc → hidden from lists; `deleted_at` set
- [ ] Required rule "NRIC copy" → employee without it shows **missing** on compliance
- [ ] Doc expiring within warning window → **expiring** on compliance + dashboard
- [ ] Folder with `access_roles: ['employee']` → employee sees docs in that folder
- [ ] Employee cannot download another employee's file (403)
- [ ] RLS prevents cross-org access
- [ ] `pnpm typecheck` passes
- [ ] Integration test for compliance status logic passes

---

## 13. Implementation order

| # | Package | Deliverable |
|---|---------|-------------|
| 1 | Storage + download API | Real R2 adapter, download route, soft delete |
| 2 | Schema + validation | `required_documents` migration, Zod schemas |
| 3 | Lib layer | Queries, filters, folders, compliance engine |
| 4 | HR hub + library | shadcn UI, upload dialog, filters |
| 5 | Folders + required rules | CRUD screens |
| 6 | Compliance + employee portal + profile section | Matrix, employee download, dashboard wire-up |

**Estimated effort:** 7–10 dev days.

---

## 15. Product decisions (24 Jul 2026)

| # | Decision |
|---|----------|
| 1 | Employees may upload **only missing/expired required** document types |
| 2 | Upload types are **strict** — active `required_documents` only (no custom) |
| 3 | **Real R2 required** in all environments (no stub fallback) |
| 4 | **Max 2 folder levels** (root + child) |
| 5 | Compliance UI: **matrix** (employees × required types) |
| 6 | Employee profile: **inline documents table + upload** |
| 7 | File limits: **10 MB**, PDF/JPG/PNG/DOC/DOCX |
| 8 | Delete: **hard delete** with extra confirmation (R2 + DB) |
| 9 | Notifications: **email HR + employee** for missing/expiring required docs |
| 10 | Managers: **view-only** access to direct reports' documents |

---

## 14. References

- [developer-brief.md](../../developer-brief.md) — R2, signed URLs, document custodian role
- [legacy-feature-map/README.md](../../legacy-feature-map/README.md) — `staff_documents`, `required_documents`
- [ui-design-inventory.md](../../ui-design-inventory.md) — `HR Admin / Documents` Pencil frame
