# Announcements Module — Design Spec

**Date:** 24 Jul 2026  
**Status:** Implemented  
**Scope:** Core MVP — HR publish workflow, audience targeting, attachments, employee/manager read paths  
**Related:** [development-phases.md](../../development-phases.md) Phase 7 · [features.md](../../features.md) §10

---

## 1. Summary

Complete the HRMS **Announcements** module so HR can draft, schedule, or immediately publish rich-text announcements with optional attachments and flexible audience targeting (branch, role, and/or department). Employees and eligible managers see a filtered list and detail page; publishing triggers in-app notifications to the targeted audience.

**Architecture choice:** **Single HR page** — enhance `/hr/announcements` (publish panel + management table). No hub/sub-routes in v1.

---

## 2. Goals

### HR Administrator

- Create announcements as **draft**, **publish now**, or **schedule** (visibility window)
- Target audience by **branch**, **system role(s)**, and/or **department(s)** — org-wide when all filters empty
- Attach one optional file (PDF/image) per announcement
- Edit title/body/schedule/targeting on any announcement (including after publish)
- Hard-delete announcements (DB + R2 attachment)

### Employee

- See announcements targeted to them (active display window only)
- List + **detail page** with rich HTML body and attachment download
- Dashboard shows **latest 3** announcements with links

### Manager

- See announcements only when `manager` is in `target_roles` **or** `target_roles` is empty (org-wide), plus branch/department filters
- List + detail under manager shell (`/manager/announcements`)

### Platform

- Reuse existing R2 / signed-download stack (`file_objects`, `/api/files/[fileId]/download`)
- In-app notifications on publish (`announcement.published` template — no email in v1)
- Strict tenant isolation via RLS + server-side audience resolution

---

## 3. Non-goals (v1)

- Email notifications on publish (in-app only)
- Re-notify everyone when editing an already-published announcement
- Manager publishing announcements
- Version history / audit diff for body edits
- Legacy import reconciliation for announcements

## 3.1 v2 additions (27 Jul 2026)

- Read receipts — mark as read when opening detail; unread badge in list. Read announcements **stay visible** (not hidden or archived).
- Multiple attachments per announcement
- Pin to dashboards — pinned announcements on employee, manager, and HR home

---

## 4. Current state

| Area | Status |
|------|--------|
| `announcements` table | ✅ Migrated |
| HR `/hr/announcements` | ✅ Draft, publish, schedule, targeting, attachments, pin |
| Employee `/employee/announcements` | ✅ List + detail + read receipts |
| Manager announcements | ✅ Nav, list, detail |
| Attachments | ✅ Multiple files via `announcement_attachments` |
| Rich text | ✅ TipTap + sanitize-html |
| Notifications on publish | ✅ In-app only |
| Pin to dashboards | ✅ Employee, manager, HR home widgets |
| Zod validation | ✅ |
| `department` targeting | ✅ |

---

## 5. Product decisions (24 Jul 2026)

| # | Decision |
|---|----------|
| Arch | **Single HR page** (`/hr/announcements`) |
| 1 | **Flexible audience:** org-wide when no filters; otherwise match **branch** and/or **role(s)** and/or **department(s)** |
| 2 | **Managers:** see announcement only if `target_roles` is empty **or** includes `manager`, then pass branch/dept filters |
| 3 | **Draft + schedule:** save draft; publish now **or** schedule via `display_from` / `display_until` |
| 4 | **Edit anytime** — title, body, schedule, targeting, attachment |
| 5 | **Hard delete** — row + R2 object + `file_objects` |
| 6 | **One optional attachment** per announcement (R2) |
| 7 | **Rich text (WYSIWYG)** — store sanitized HTML in `body` |
| 8 | **List + detail page** for employee (`/employee/announcements/[id]`) |
| 9 | **In-app notification only** on publish (not on draft save) |
| 10 | **Employee dashboard:** latest **3** announcements with links (not count-only stat) |

---

## 6. Data model

### 6.1 Migration — extend `announcements`

```sql
-- 20260724210000_announcements_workflow.sql

create type public.announcement_status as enum ('draft', 'published');

alter table public.announcements
  add column status public.announcement_status not null default 'published',
  add column target_department_ids uuid[] not null default '{}',
  add column updated_at timestamptz not null default now();

-- Backfill existing rows as published
update public.announcements set status = 'published' where status is null;

-- posted_at: set on first publish; drafts may keep posted_at null until published
alter table public.announcements alter column posted_at drop not null;

create index announcements_org_status_posted_idx
  on public.announcements (organization_id, status, posted_at desc);
```

**Existing columns (unchanged semantics):**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK |
| `title` | text | Required, max 200 |
| `body` | text | **Sanitized HTML** after rich-text editor |
| `status` | enum | `draft` \| `published` |
| `posted_at` | timestamptz | Set on first publish; null while draft |
| `display_from` | date | Visibility start; null = immediately when published |
| `display_until` | date | Visibility end; null = no end |
| `branch_id` | uuid | Nullable; null = all branches |
| `target_roles` | text[] | e.g. `['employee','manager']`; empty = all roles |
| `target_department_ids` | uuid[] | Empty = all departments |
| `attachment_file_id` | uuid | FK → `file_objects`, nullable |
| `created_by_user_id` | uuid | FK → auth.users |
| `created_at` / `updated_at` | timestamptz | |

### 6.2 Audience matching rules

Server-side function `announcementMatchesAudience(announcement, viewer)` — used in list/detail queries and notification fan-out.

| Filter | Empty means | Non-empty means |
|--------|-------------|-----------------|
| `branch_id` | All branches | Viewer’s employee `branch_id` must match |
| `target_roles` | All roles | Viewer must hold **at least one** listed role |
| `target_department_ids` | All departments | Viewer’s `department_id` must be in array |

**Combined logic:** viewer matches iff **every non-empty dimension** passes (AND across dimensions).

**Visibility (published only):**

- `status = 'published'`
- `display_from` is null OR `display_from <= today`
- `display_until` is null OR `display_until >= today`

**HR list:** shows all statuses (draft, scheduled, published, expired) with status badges.

### 6.3 Attachment storage

- Upload category: `announcement-attachments`
- Reuse `saveFileObject` / R2 pipeline from documents module
- Allowed types: PDF, JPG, PNG (same 10 MB cap as documents)
- Download: existing signed URL route; extend `download-auth.ts` so any org member in the announcement audience may download the attachment when viewing a published announcement they can access

### 6.4 Rich text safety

- Editor: **TipTap** (new dependency) with limited toolbar: bold, italic, underline, bullet/ordered list, link, headings h2/h3
- Persist HTML in `body`
- Render with `sanitize-html` (or `isomorphic-dompurify`) on server before `dangerouslySetInnerHTML`
- Strip scripts, inline event handlers, and disallowed tags on save **and** render

---

## 7. Routes & information architecture

```text
HR Administrator
└── /hr/announcements              Compose + table (draft / published / scheduled / expired)

Employee
├── /employee/announcements        Filtered list (title, date, excerpt)
└── /employee/announcements/[id]   Detail + attachment download

Manager
├── /manager/announcements         Same list logic as employee, manager shell
└── /manager/announcements/[id]    Detail

API (unchanged path)
└── GET /api/files/[fileId]/download   Extend auth for announcement attachments
```

**Nav:**

- Employee: existing `/employee/announcements` entry — unchanged
- HR: existing `/hr/announcements` — unchanged
- Manager: add **Announcements** under Workplace or My team section in `portal-nav.ts`

**Dashboard:**

- Replace employee dashboard announcements **count** `StatCard` with a **“Latest announcements”** section listing up to 3 items (title + relative date + link to detail). If none, show empty hint linking to `/employee/announcements`.

---

## 8. HR workflow

### 8.1 Create / edit form (single page)

Fields:

| Field | Control |
|-------|---------|
| Title | Input |
| Body | Rich text editor |
| Audience — branch | Optional select (single branch) |
| Audience — roles | Multi-checkbox: Employee, Manager |
| Audience — departments | Multi-select (org departments) |
| Schedule — publish mode | Radio: **Publish now** \| **Schedule** \| **Save draft** |
| Display from / until | Date pickers (required when Schedule; optional end date) |
| Attachment | Optional file input (replace/remove on edit) |

**Actions:**

| Action | `status` | `posted_at` | Notifications |
|--------|----------|-------------|---------------|
| Save draft | `draft` | unchanged / null | None |
| Publish now | `published` | `now()` if first publish | Fan-out in-app |
| Schedule | `published` | `now()` if first publish | Fan-out in-app at publish time (not at `display_from`) |

> **Note:** Notifications fire when HR clicks **Publish** (immediate or scheduled). Employees only see the item in list/detail once the display window is active. Wording in HR UI: “Recipients are notified now; announcement appears on the scheduled date.”

### 8.2 HR table columns

Title · Status badge · Audience summary · Display window · Posted at · Row actions (Edit, Delete)

Status badges:

| Badge | Condition |
|-------|-----------|
| Draft | `status = draft` |
| Scheduled | `published` + `display_from > today` |
| Active | `published` + in display window |
| Expired | `published` + `display_until < today` |

### 8.3 Delete

- Confirm dialog (destructive)
- Delete `announcements` row
- If `attachment_file_id`: hard-delete `file_objects` + R2 object (same order as documents module)

---

## 9. Notifications

On transition to `published` (from draft or new):

1. Resolve recipient user IDs: all users in org whose employee record + roles match audience filters
2. For each user, `queueNotification({ channel: 'in_app', template: 'announcement.published', ... })`
3. Idempotency key: `announcement:{id}:publish:{posted_at_iso}` (re-publish after edit does **not** re-notify unless product changes — v1: notify **once** on first publish only)

**Payload:**

```json
{
  "announcementId": "uuid",
  "title": "string",
  "href": "/employee/announcements/uuid"
}
```

Manager recipients get `href` under `/manager/announcements/[id]` when their primary portal role is manager.

---

## 10. UI design (shadcn)

Follow Employees / Documents patterns:

| Screen | Components |
|--------|------------|
| HR page | `PortalPageHeader`, compose `Card`, `HrTableCard` or table in `PortalSectionCard`, edit `Dialog` or inline panel |
| Audience | `Select` (branch), role `Checkbox` group, department multi `Select` |
| Rich text | `AnnouncementEditor` (TipTap wrapper) |
| Employee/manager list | `HrTableCard` or linked rows → detail |
| Detail | `PortalPageHeader`, prose HTML container, attachment `Button` → download |
| Dashboard widget | `PortalSectionCard` with 3 link rows |

Remove legacy plain `PublishAnnouncementForm` textarea-only flow.

---

## 11. Code structure

```text
apps/web/src/
  app/(hr)/hr/announcements/
    page.tsx
    actions.ts                    # create, update, publish, delete
  app/(employee)/employee/announcements/
    page.tsx
    [id]/page.tsx
  app/(manager)/manager/announcements/
    page.tsx
    [id]/page.tsx
  components/hr/announcements/
    announcement-compose-form.tsx
    announcement-editor.tsx
    announcement-table.tsx
    announcement-audience-fields.tsx
  components/announcements/
    announcement-list.tsx
    announcement-detail.tsx
    announcement-dashboard-widget.tsx
  lib/hr/announcements.ts         # HR CRUD, audience summary
  lib/announcements/
    audience.ts                     # match + resolve recipients
    queries.ts                      # filtered list/get for portals
    sanitize.ts
    publish-notifications.ts
  lib/files/download-auth.ts        # extend for announcement attachments

packages/validation/src/announcements.ts

supabase/migrations/20260724210000_announcements_workflow.sql

tests/integration/announcements-audience.test.ts
```

Move publish action out of monolithic `hr/actions.ts` into `hr/announcements/actions.ts`.

---

## 12. Entitlements

- Module key: `announcements` (already in `CORE_MODULES`)
- All routes call `requireModule("announcements")` in addition to role checks

---

## 13. Exit criteria

- [x] HR saves draft → not visible to employees
- [x] HR publishes now → targeted employees see list + detail; in-app notification queued
- [x] HR schedules with future `display_from` → hidden until date; notification sent at publish click
- [x] Branch + department + role filters correctly narrow audience
- [x] Manager sees item only when `target_roles` empty or contains `manager`
- [x] Rich text renders safely (sanitize-html)
- [x] Attachment upload + download works for audience members
- [x] Hard delete removes DB row and R2 object
- [x] Employee dashboard shows latest 3 with links (+ pinned)
- [x] Read receipt stored when user opens detail
- [x] Multiple attachments supported
- [x] Pin shows on all role dashboards
- [x] `pnpm typecheck` passes
- [x] Integration test for `announcementMatchesAudience` passes

---

## 14. Implementation order

| # | Package | Deliverable |
|---|---------|-------------|
| 1 | Schema + validation | Migration (`status`, `target_department_ids`), Zod schemas |
| 2 | Lib — audience | Match rules, recipient resolution, filtered queries |
| 3 | Rich text + sanitize | TipTap editor component, HTML sanitizer |
| 4 | HR page | Compose form, table, edit/delete, attachment upload |
| 5 | Employee + manager portals | List, detail routes, download auth |
| 6 | Notifications + dashboard | Publish fan-out, latest-3 widget, smoke-test routes |

**Estimated effort:** 5–7 dev days.

---

## 15. References

- [2026-07-24-documents-module-design.md](./2026-07-24-documents-module-design.md) — R2, download API, file patterns
- [ui-design-inventory.md](../../ui-design-inventory.md) — Announcements Pencil frames (detail layout reference)
- [features.md](../../features.md) §10
