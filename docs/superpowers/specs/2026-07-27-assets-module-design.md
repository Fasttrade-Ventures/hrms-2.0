# Assets Module — Design Spec

**Date:** 27 Jul 2026  
**Status:** Implemented — see [implementation plan](../plans/2026-07-27-assets-module.md)  
**Scope:** Core — full asset lifecycle for HR and employee self-service  
**Related:** [features.md](../../features.md) §11 · [development-phases.md](../../development-phases.md) Phase 8

---

## 1. Summary

Upgrade the scaffold **Assets** module into a full **asset lifecycle** system:

1. **HR asset register** — create, edit, assign, reassign, return, dispose; filters; detail page with assignment timeline  
2. **Category catalog** — HR-managed categories under Organization, each with optional **custom fields** (e.g. IMEI, vehicle plate)  
3. **Assignment history** — every assign/reassign/return recorded; **employee name/number snapshotted** so ex-staff remain identifiable after record removal  
4. **Employee self-service** — view assigned assets, acknowledge receipt, report issues, request return or replacement (queues HR in-app notification)  
5. **Offboarding support** — return checklist on HR employee profile for assets still assigned  
6. **Notifications + audit** — in-app notifications on assign/reassign/return; audit log entries for all asset mutations  

**Architecture choice:** Extend the existing `assets` table, add normalized **assignment history**, **category catalog**, and **employee requests** tables. HR Administrator only in v1 (no `asset_manager` permission split, no manager portal).

---

## 2. Product decisions (27 Jul 2026)

| # | Question | Decision |
|---|----------|----------|
| 1 | v1 lifecycle scope | **C — Full lifecycle** with employee acknowledgement |
| 2 | Who manages assets | **A — HR Administrator only** |
| 3 | Employee “My assets” | **D — Detail + acknowledge + report issue + request return/replacement** |
| 4 | Manager portal | **A — No manager assets page in v1** |
| 5 | Categories | **D — HR-managed catalog + per-category custom fields** |
| 6 | Core fields (v1) | **C — Status, notes, purchase date, value, branch, condition, warranty expiry** |
| 7 | Assignment model | **B — One active assignee + assignment history** (snapshot ex-staff name) |
| 8 | Return & offboarding | **B — HR manual return + offboarding checklist on employee profile** |
| 9 | HR register UX | **B — Filters, edit, return + `/hr/assets/[id]` detail with timeline** |
| 10 | Notifications & audit | **C — In-app notify on assign/reassign/return + audit log** (no email in v1) |

---

## 3. Goals

### HR Administrator (`/hr/assets`)

- **Register list** with filters: status, category, branch, assignee (including “Unassigned”), free-text search (name, serial, custom field values)
- **Create asset** — category picker drives dynamic custom-field inputs; optional immediate assign
- **Edit asset** — core fields + custom values; cannot silently delete history
- **Assign / reassign** — closes current assignment row, opens new one with `assigned_at`; notifies employee
- **Return** — sets assignment `returned_at`, asset status → `returned` (or `available` if HR chooses to put back in pool)
- **Dispose** — status → `disposed`; no active assignee
- **Detail page** (`/hr/assets/[id]`) — asset summary, custom fields, current assignee, **assignment timeline** (all past holders with snapshotted names), open employee requests, audit snippet
- Link to **Organization → Asset categories** for catalog CRUD

### Organization (`/hr/organization/asset-categories`)

- CRUD asset categories (name, description, sort order, active flag)
- **Field schema** per category — JSON-defined custom fields shown on create/edit asset forms  
  Example field types in v1: `text`, `number`, `date`, `select` (options array)
- Seed defaults on org bootstrap: Laptop, Phone, Monitor, Vehicle, Access card, Other

### Employee (`/employee/assets`)

- **List** — assets currently assigned (active assignment only)
- **Detail** (`/employee/assets/[id]`) — name, category, serial, condition, issued date, custom fields (read-only), warranty expiry
- **Acknowledge receipt** — one-time action on current assignment (`acknowledged_at`); disabled after acknowledged
- **Report issue** — creates `asset_requests` row (`kind: issue`); notifies HR (in-app)
- **Request return** — `kind: return`; notifies HR
- **Request replacement** — `kind: replacement`; notifies HR

### HR employee profile (`/hr/employees/[employeeId]`)

- **Assets / offboarding** section when employee has active assignments:
  - List assigned assets with serial, category, issued date
  - Per-asset **Mark returned** shortcut (same as return from asset detail)
  - Banner when employment is terminating/terminated and assets remain: “N assets still assigned”

### Notifications (in-app only, v1)

| Template | Recipient | Trigger |
|----------|-----------|---------|
| `asset.assigned` | Employee | New assignment or reassign to them |
| `asset.returned` | Employee | HR marks their assignment returned |
| `asset.request` | HR users with access | Employee issue / return / replacement request |

Reuse `queueNotification` + `notification_outbox`; extend `resolveNotificationHref` for asset templates.

### Audit (v1)

Log via `logAuditEvent` for: `asset.created`, `asset.updated`, `asset.assigned`, `asset.returned`, `asset.disposed`, `asset.acknowledged`, `asset.request.created`, `asset.category.*`.

`resource_type`: `asset` | `asset_category` | `asset_request`.

---

## 4. Non-goals (v1)

- Manager team asset view or manager assign/return
- `asset_manager` specialist permission (HR admin only)
- Bulk CSV import of assets
- Photo / attachment on asset record (receipt, asset tag image)
- Barcode / QR scanning
- Depreciation accounting integration
- Auto-return on employment status change (manual + checklist only; no workflow engine)
- Email notifications for asset events
- Shared / multi-assignee assets or checkout pool mechanics
- Integration with claims module for asset purchase reimbursement

### v2 candidates

- `asset_manager` permission scoped to branch
- Manager read-only team assets
- Bulk import CSV
- Asset photos / document attachments (reuse documents R2 pattern)
- Email on assign
- Auto-flag unreturned assets when employment → terminated
- Disposal approval workflow

---

## 5. Current state

| Area | Status |
|------|--------|
| `assets` table | ✅ Extended lifecycle schema |
| `/hr/assets` | ✅ Filters, create, detail, lifecycle |
| `/employee/assets` | ✅ List + detail with acknowledge/requests |
| Assignment history | ✅ `asset_assignments` with name snapshots |
| Category catalog | ✅ `/hr/organization/asset-categories` |
| Employee acknowledge / requests | ✅ |
| Offboarding checklist | ✅ HR employee profile panel |
| Asset notifications | ✅ In-app |
| Asset audit events | ✅ |

---

## 6. Data model

### 6.1 Enum — `asset_status`

```sql
create type public.asset_status as enum (
  'available',   -- in inventory, unassigned
  'assigned',    -- actively assigned
  'returned',    -- returned, not yet back in pool (optional intermediate)
  'disposed'     -- written off / no longer in use
);
```

### 6.2 Enum — `asset_condition`

```sql
create type public.asset_condition as enum (
  'new',
  'good',
  'fair',
  'poor',
  'damaged'
);
```

### 6.3 Enum — `asset_request_kind` / `asset_request_status`

```sql
create type public.asset_request_kind as enum ('issue', 'return', 'replacement');
create type public.asset_request_status as enum ('open', 'resolved', 'cancelled');
```

### 6.4 Table — `asset_categories`

```sql
create table public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  field_schema jsonb not null default '[]',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
```

**`field_schema` item shape (application validation):**

```ts
type AssetCategoryField = {
  key: string;           // e.g. "imei", "plate_number"
  label: string;
  type: "text" | "number" | "date" | "select";
  required?: boolean;
  options?: string[];    // for select
};
```

### 6.5 Alter — `assets`

Migrate existing free-text `category` → `category_id` FK; drop `category` text column after backfill.

```sql
alter table public.assets
  add column category_id uuid references public.asset_categories(id) on delete restrict,
  add column status public.asset_status not null default 'available',
  add column condition public.asset_condition,
  add column branch_id uuid references public.branches(id) on delete set null,
  add column notes text,
  add column purchase_date date,
  add column purchase_value numeric(12,2),
  add column warranty_expires_on date,
  add column custom_values jsonb not null default '{}',
  add column updated_at timestamptz not null default now();

-- Backfill: create "Uncategorized" category per org, map existing category text where possible
-- Remove assigned_employee_id, issued_at, returned_at from assets (moved to assignments)
```

| Column | Notes |
|--------|-------|
| `category_id` | Required after migration |
| `custom_values` | Keys match `field_schema[].key` for selected category |
| `status` | Derived from active assignment on write; HR can set `disposed` |
| `branch_id` | Physical location / owning branch |

**Denormalization:** `assets` no longer stores current assignee. Current assignee = latest `asset_assignments` row where `returned_at is null`.

### 6.6 Table — `asset_assignments`

```sql
create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  employee_number text,
  assigned_at date not null default current_date,
  returned_at date,
  acknowledged_at timestamptz,
  assigned_by_user_id uuid references auth.users(id),
  returned_by_user_id uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  constraint asset_assignments_return_after_assign check (
    returned_at is null or returned_at >= assigned_at
  )
);

create index asset_assignments_asset_active_idx
  on public.asset_assignments (asset_id)
  where returned_at is null;

create unique index asset_assignments_one_active_per_asset
  on public.asset_assignments (asset_id)
  where returned_at is null;
```

| Column | Notes |
|--------|-------|
| `employee_name` | **Snapshot** at assign time — preserved when `employee_id` nullified |
| `employee_number` | Snapshot for display in timeline |
| `acknowledged_at` | Set by employee acknowledge action |

**Rule:** On assign, copy `employees.full_name` and `employees.employee_number` into snapshot columns. Never update snapshots retroactively.

### 6.7 Table — `asset_requests`

```sql
create table public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  assignment_id uuid references public.asset_assignments(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind public.asset_request_kind not null,
  status public.asset_request_status not null default 'open',
  message text,
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

Employee can only create requests for assets currently assigned to them (active assignment).

### 6.8 RLS

Same org-scoped pattern as existing `assets` policy:

- HR admin: full CRUD on categories, assets, assignments (via server actions with `requireRole`)
- Employee: `select` on own active assignments + assets linked to those assignments; `insert` on `asset_requests` for own assets; `update` on `acknowledged_at` for own active assignment only (enforced in server actions)

All mutations go through Next.js server actions (service role for notifications/audit), matching documents and calendar patterns.

---

## 7. Application layer

### 7.1 Packages

| Package | Contents |
|---------|----------|
| `packages/validation/src/assets.ts` | Zod schemas: category field schema, create/update asset, assign, return, employee request |
| `packages/domain/src/assets/` | Status transitions, snapshot helpers, custom field validation against schema |

### 7.2 Web lib (`apps/web/src/lib/assets/`)

| Module | Responsibility |
|--------|----------------|
| `queries.ts` | `listAssets`, `getAssetDetail`, `listMyAssets`, `getMyAssetDetail`, `listAssetAssignments`, `listOpenAssetRequests` |
| `categories.ts` | Category CRUD (org catalog) |
| `assignments.ts` | Assign, reassign, return, acknowledge |
| `requests.ts` | Employee create request; HR resolve |
| `notifications.ts` | Queue asset notification helpers |
| `audit.ts` | Thin wrappers over `logAuditEvent` |

### 7.3 Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/hr/assets` | HR | Filtered register + create |
| `/hr/assets/[assetId]` | HR | Detail + timeline + actions |
| `/hr/organization/asset-categories` | HR | Category catalog list |
| `/hr/organization/asset-categories/create` | HR | New category + field builder |
| `/hr/organization/asset-categories/[id]/edit` | HR | Edit category |
| `/employee/assets` | Employee | My assigned assets |
| `/employee/assets/[assetId]` | Employee | Detail + acknowledge + requests |

### 7.4 HR employee profile integration

Add **Assigned assets** card to `EmployeeProfileView` (or sibling component on `/hr/employees/[employeeId]`):

- Query active assignments for `employeeId`
- Link each row to `/hr/assets/[assetId]`
- **Mark returned** inline action → `returnAssetAssignment` server action

Show warning callout when `employment_status` in `terminated` / `resigned` / `notice` and active assignments > 0.

### 7.5 Status transitions

```
available ──assign──► assigned
assigned ──return──► available | returned
assigned ──reassign──► assigned (new assignment row; previous closed)
any (except disposed) ──dispose──► disposed
```

`returned` status optional: HR can choose “return to inventory” (`available`) vs “returned pending inspection” (`returned`) on return dialog.

---

## 8. UI notes

- Reuse HR form primitives (`HrField`, `HrSelect`, `HrTextInput`) and `ListCard` / `PortalSectionCard` patterns
- Category **field builder** on org page: simple repeatable rows (key, label, type, required, options)
- Asset create/edit: when category changes, re-render custom field inputs from schema
- Assignment timeline: vertical list, newest first; show snapshotted name even if employee deleted
- Employee detail: prominent **Acknowledge** CTA until `acknowledged_at` set
- Request forms: textarea + submit; show “Request pending” badge if open request exists

---

## 9. Migration strategy

1. Create enums + `asset_categories`, `asset_assignments`, `asset_requests`
2. Seed default categories per organization
3. Backfill `category_id` from existing `category` text (fuzzy match or “Uncategorized”)
4. Migrate existing `assigned_employee_id` / `issued_at` / `returned_at` into initial `asset_assignments` rows with name snapshots from `employees` join
5. Add new columns to `assets`; drop deprecated assignee columns
6. Set `status` from assignment state

---

## 10. Testing

| Layer | Coverage |
|-------|----------|
| `packages/domain/src/assets/*.test.ts` | Status transitions, custom field validation, snapshot helper |
| `tests/integration/assets.test.ts` | Assignment history preserves name when employee_id null; one active assignment constraint |
| Smoke test | `/hr/assets`, `/employee/assets` auth guards; `asset_categories` table accessible |
| Manual QA | HR full flow; employee acknowledge + request; offboarding checklist on profile |

---

## 11. Documentation updates

- `docs/features.md` §11 — mark assign/return, categories, employee requests ✅
- `docs/ui-design-inventory.md` — asset detail, category admin, employee detail
- Organization hub — add Asset categories tile

---

## 12. Resolved items

1. Manager visibility: **none** in v1.  
2. Permission model: **HR Administrator only** (not `asset_manager`).  
3. Assignment history: **required**; ex-employee names **snapshotted**, not live join only.  
4. Email notifications: **out of v1**; in-app only.  
5. Photos/attachments: **out of v1** (user chose 6C not 6D).

---

## 13. Exit criteria

- [x] Migration applied; existing assets backfilled without data loss
- [x] HR register: filters, create, edit, assign, reassign, return, dispose, detail timeline
- [x] Organization asset categories with custom fields
- [x] Employee: detail, acknowledge, issue/return/replacement requests
- [x] HR employee profile offboarding asset checklist
- [x] In-app notifications + audit events for asset mutations
- [x] `pnpm typecheck` passes
- [x] Domain + integration tests pass
- [x] Smoke test updated and passing
