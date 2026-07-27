# Assets Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full Assets module — HR register with lifecycle (assign/reassign/return/dispose), category catalog with custom fields, assignment history with employee name snapshots, employee self-service (acknowledge + requests), offboarding checklist on employee profile, in-app notifications, and audit logging.

**Architecture:** Migration extends `assets` and adds `asset_categories`, `asset_assignments`, `asset_requests`. Domain helpers in `packages/domain/src/assets/` handle status transitions and custom-field validation. Server libs in `apps/web/src/lib/assets/` own queries and mutations. HR and employee UI reuse existing portal patterns (`ListCard`, `HrField`, org catalog CRUD style).

**Tech Stack:** Next.js App Router, Supabase PostgreSQL + RLS, Zod (`@hrms/validation`), shadcn/ui, Vitest, `queueNotification` + `logAuditEvent`.

**Spec:** [2026-07-27-assets-module-design.md](../specs/2026-07-27-assets-module-design.md)

## Global Constraints

- Tenant isolation: every query filters by `organization_id`; RLS on all new tables.
- Auth: HR routes use `requireRole("hr_administrator")`; employee routes use `requireEmployeeContext()`.
- Module gate: `assets` already in `CORE_MODULES`; call `requireModule("assets")` on all asset pages/actions.
- HR-only management in v1 — no manager portal, no `asset_manager` permission.
- Assignment history: snapshot `employee_name` + `employee_number` at assign time; never update retroactively.
- One active assignment per asset (`returned_at is null` unique index).
- In-app notifications only — no email templates in v1.
- No photo/attachment fields on assets in v1.
- `DEPLOYMENT_MODE=standalone`: `DEFAULT_ORGANIZATION_ID` env for org scope.

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260727210000_assets_lifecycle.sql` | Enums, new tables, alter `assets`, backfill, drop legacy columns |
| `packages/domain/src/assets/status.ts` | Status transition helpers |
| `packages/domain/src/assets/custom-fields.ts` | Validate `custom_values` against category `field_schema` |
| `packages/domain/src/assets/*.test.ts` | Domain unit tests |
| `packages/domain/src/index.ts` | Re-export assets |
| `packages/validation/src/assets.ts` | Zod schemas for categories, assets, assignments, requests |
| `packages/validation/src/index.ts` | Export asset schemas |
| `apps/web/src/lib/assets/types.ts` | Shared TS types |
| `apps/web/src/lib/assets/queries.ts` | HR + employee read queries |
| `apps/web/src/lib/assets/categories.ts` | Category CRUD |
| `apps/web/src/lib/assets/assignments.ts` | Assign, reassign, return, acknowledge |
| `apps/web/src/lib/assets/requests.ts` | Employee requests + HR resolve |
| `apps/web/src/lib/assets/notifications.ts` | `queueNotification` helpers |
| `apps/web/src/lib/assets/audit.ts` | `logAuditEvent` wrappers |
| `apps/web/src/lib/assets/parse-filters.ts` | HR register URL filter parsing |
| `apps/web/src/app/(hr)/hr/assets/actions.ts` | HR asset server actions |
| `apps/web/src/app/(hr)/hr/organization/asset-categories/**` | Category catalog pages |
| `apps/web/src/components/hr/assets/**` | HR asset UI components |
| `apps/web/src/components/employee/assets/**` | Employee asset UI |
| `apps/web/src/app/(hr)/hr/assets/page.tsx` | HR register |
| `apps/web/src/app/(hr)/hr/assets/[assetId]/page.tsx` | HR detail |
| `apps/web/src/app/(employee)/employee/assets/[assetId]/page.tsx` | Employee detail |
| `apps/web/src/components/hr/employees/employee-assets-panel.tsx` | Offboarding checklist |
| `apps/web/src/lib/notifications/links.ts` | Asset notification hrefs |
| `tests/integration/assets.test.ts` | Integration tests |
| `scripts/smoke-test.ts` | Asset table + route checks |

---

### Task 1: Migration + domain + validation

**Files:**
- Create: `supabase/migrations/20260727210000_assets_lifecycle.sql`
- Create: `packages/domain/src/assets/status.ts`
- Create: `packages/domain/src/assets/custom-fields.ts`
- Create: `packages/domain/src/assets/status.test.ts`
- Create: `packages/domain/src/assets/custom-fields.test.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `packages/validation/src/assets.ts`
- Modify: `packages/validation/src/index.ts`

**Interfaces:**
- Produces: `assertAssetStatusTransition(from: AssetStatus, to: AssetStatus, action: AssetAction): void`
- Produces: `validateCustomValues(schema: AssetCategoryField[], values: Record<string, unknown>): Record<string, string | number | null>`
- Produces: `assetCategoryFieldSchema`, `createAssetSchema`, `updateAssetSchema`, `assignAssetSchema`, `returnAssetSchema`, `assetRequestSchema` in `@hrms/validation`

- [ ] **Step 1: Write failing domain tests**

Create `packages/domain/src/assets/status.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { assertAssetStatusTransition, nextAssetStatusAfterReturn } from "./status";

describe("assertAssetStatusTransition", () => {
  it("allows assign from available", () => {
    expect(() =>
      assertAssetStatusTransition("available", "assigned", "assign"),
    ).not.toThrow();
  });

  it("blocks assign from disposed", () => {
    expect(() =>
      assertAssetStatusTransition("disposed", "assigned", "assign"),
    ).toThrow(/cannot assign/i);
  });
});

describe("nextAssetStatusAfterReturn", () => {
  it("returns available when return to inventory", () => {
    expect(nextAssetStatusAfterReturn("to_inventory")).toBe("available");
  });

  it("returns returned when pending inspection", () => {
    expect(nextAssetStatusAfterReturn("pending_inspection")).toBe("returned");
  });
});
```

Create `packages/domain/src/assets/custom-fields.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { validateCustomValues } from "./custom-fields";

const schema = [
  { key: "imei", label: "IMEI", type: "text" as const, required: true },
  { key: "color", label: "Color", type: "select" as const, options: ["Black", "Silver"] },
];

describe("validateCustomValues", () => {
  it("requires required fields", () => {
    expect(() => validateCustomValues(schema, {})).toThrow(/imei/i);
  });

  it("returns normalized values", () => {
    expect(validateCustomValues(schema, { imei: "123", color: "Black" })).toEqual({
      imei: "123",
      color: "Black",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/domain/src/assets --maxWorkers=1`

Expected: FAIL — modules not found

- [ ] **Step 3: Implement domain helpers**

Create `packages/domain/src/assets/status.ts`:

```typescript
export type AssetStatus = "available" | "assigned" | "returned" | "disposed";
export type AssetAction = "assign" | "return" | "dispose" | "reassign";
export type ReturnDestination = "to_inventory" | "pending_inspection";

const ALLOWED: Record<AssetStatus, Partial<Record<AssetAction, AssetStatus>>> = {
  available: { assign: "assigned", dispose: "disposed" },
  assigned: { return: "returned", dispose: "disposed", reassign: "assigned" },
  returned: { assign: "assigned", dispose: "disposed" },
  disposed: {},
};

export function assertAssetStatusTransition(
  from: AssetStatus,
  to: AssetStatus,
  action: AssetAction,
): void {
  const expected = ALLOWED[from]?.[action];
  if (expected !== to) {
    throw new Error(`Cannot ${action} asset while status is ${from}.`);
  }
}

export function nextAssetStatusAfterReturn(
  destination: ReturnDestination,
): "available" | "returned" {
  return destination === "to_inventory" ? "available" : "returned";
}
```

Create `packages/domain/src/assets/custom-fields.ts` with `AssetCategoryField` type and `validateCustomValues` per spec §6.4.

Export from `packages/domain/src/index.ts`.

- [ ] **Step 4: Create validation schemas**

Create `packages/validation/src/assets.ts` with Zod schemas matching spec field shapes. Export from `packages/validation/src/index.ts`.

- [ ] **Step 5: Write migration**

Create `supabase/migrations/20260727210000_assets_lifecycle.sql`:

1. Create enums: `asset_status`, `asset_condition`, `asset_request_kind`, `asset_request_status`
2. Create `asset_categories` + RLS policy `asset_categories_org`
3. Seed default categories per org (Laptop, Phone, Monitor, Vehicle, Access card, Other) + `Uncategorized`
4. Add new columns to `assets` (nullable `category_id` first)
5. Backfill `category_id` from `category` text (match by name case-insensitive, else Uncategorized)
6. Create `asset_assignments` + indexes + RLS `asset_assignments_org`
7. Backfill assignments from `assigned_employee_id` / `issued_at` / `returned_at` with employee name snapshots via join
8. Set `assets.status` from assignment state
9. Make `category_id` NOT NULL; drop `category`, `assigned_employee_id`, `issued_at`, `returned_at`
10. Create `asset_requests` + RLS `asset_requests_org`

- [ ] **Step 6: Apply migration**

Run: `set -a && source apps/web/.env.local && set +a && supabase db push`

Expected: migration applies without error

- [ ] **Step 7: Run domain tests**

Run: `pnpm exec vitest run packages/domain/src/assets --maxWorkers=1`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260727210000_assets_lifecycle.sql \
  packages/domain/src/assets packages/domain/src/index.ts \
  packages/validation/src/assets.ts packages/validation/src/index.ts
git commit -m "Add assets lifecycle migration, domain helpers, and validation schemas."
```

---

### Task 2: Asset category catalog (Organization)

**Files:**
- Create: `apps/web/src/lib/assets/categories.ts`
- Create: `apps/web/src/components/hr/organization/asset-categories.tsx`
- Create: `apps/web/src/components/hr/organization/asset-category-form.tsx`
- Create: `apps/web/src/app/(hr)/hr/organization/asset-categories/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/organization/asset-categories/create/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/organization/asset-categories/[categoryId]/edit/page.tsx`
- Modify: `apps/web/src/app/(hr)/hr/organization/actions.ts` — add category CRUD actions
- Modify: `apps/web/src/components/hr/organization/organization-hub.tsx` — add tile
- Modify: `apps/web/src/lib/hr/organization.ts` — include category count in hub data

**Interfaces:**
- Consumes: `assetCategoryFieldSchema`, `createAssetCategorySchema`, `updateAssetCategorySchema` from `@hrms/validation`
- Produces: `listAssetCategories()`, `getAssetCategory(id)`, `createAssetCategory()`, `updateAssetCategory()`, `deactivateAssetCategory()`

- [ ] **Step 1: Implement `categories.ts`**

```typescript
export async function listAssetCategories(options?: { activeOnly?: boolean }): Promise<AssetCategoryRow[]>
export async function getAssetCategory(categoryId: string): Promise<AssetCategoryRow>
export async function createAssetCategory(input: CreateAssetCategoryInput): Promise<string>
export async function updateAssetCategory(categoryId: string, input: UpdateAssetCategoryInput): Promise<void>
```

Use `requireRole("hr_administrator")` + org filter. Log `asset.category.created` / `asset.category.updated` via audit helper (stub ok in this task; wire in Task 6).

- [ ] **Step 2: Add org actions**

In `organization/actions.ts`, add `createAssetCategoryAction`, `updateAssetCategoryAction` using `useActionState` pattern from leave-types.

- [ ] **Step 3: Build field builder UI**

`asset-category-form.tsx` — repeatable rows: key, label, type select, required checkbox, options textarea (for select). Serialize to `field_schema` JSON hidden input or client state → FormData JSON string field `fieldSchema`.

- [ ] **Step 4: Wire pages**

Mirror `leave-types` pages: list with `ListCard`, create/edit with form shell.

- [ ] **Step 5: Add org hub tile**

Add `asset-categories` entry to `areaMeta` in `organization-hub.tsx` with icon `"assets"` (add to `portal-icons.tsx` if missing).

- [ ] **Step 6: Manual verify**

Navigate `/hr/organization/asset-categories` as HR; create "Laptop" category with IMEI text field.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/assets/categories.ts apps/web/src/components/hr/organization/asset-category* \
  apps/web/src/app/(hr)/hr/organization/asset-categories apps/web/src/app/(hr)/hr/organization/actions.ts \
  apps/web/src/components/hr/organization/organization-hub.tsx apps/web/src/lib/hr/organization.ts
git commit -m "Add HR organization asset category catalog with custom field schema."
```

---

### Task 3: Server lib — queries, assignments, filters

**Files:**
- Create: `apps/web/src/lib/assets/types.ts`
- Create: `apps/web/src/lib/assets/queries.ts`
- Create: `apps/web/src/lib/assets/assignments.ts`
- Create: `apps/web/src/lib/assets/parse-filters.ts`
- Delete/refactor: `apps/web/src/lib/hr/assets.ts` — move to `lib/assets/` and update imports

**Interfaces:**
- Produces: `listAssets(filters: AssetRegisterFilters): Promise<AssetListRow[]>`
- Produces: `getAssetDetail(assetId: string): Promise<AssetDetail>`
- Produces: `listAssetAssignments(assetId: string): Promise<AssetAssignmentRow[]>`
- Produces: `assignAsset(input)`, `returnAssetAssignment(input)`, `disposeAsset(assetId)`
- Produces: `buildAssetRegisterHref(year?, filters?)` for future-proofing (filters only in v1)

- [ ] **Step 1: Define types in `types.ts`**

```typescript
export type AssetListRow = {
  id: string;
  name: string;
  serialNumber: string | null;
  status: AssetStatus;
  categoryName: string;
  branchName: string | null;
  assigneeName: string | null;
  assignedAt: string | null;
};

export type AssetDetail = AssetListRow & {
  condition: AssetCondition | null;
  notes: string | null;
  purchaseDate: string | null;
  purchaseValue: number | null;
  warrantyExpiresOn: string | null;
  customValues: Record<string, unknown>;
  categoryId: string;
  fieldSchema: AssetCategoryField[];
  activeAssignment: AssetAssignmentRow | null;
  openRequests: AssetRequestRow[];
};
```

- [ ] **Step 2: Implement `listAssets` with filters**

Query `assets` joined to `asset_categories`, `branches`, and lateral subquery / separate query for active assignment (`returned_at is null`).

Filters (query params):
- `status`, `categoryId`, `branchId`, `assigneeId` (`unassigned` sentinel)
- `q` — ilike on name, serial_number, `custom_values::text`

- [ ] **Step 3: Implement assignment mutations in `assignments.ts`**

```typescript
export async function assignAsset({
  assetId,
  employeeId,
  assignedAt,
  notes,
}: AssignAssetInput): Promise<void> {
  // 1. Load asset + employee; assert status available|assigned
  // 2. Close active assignment if reassign (set returned_at = assignedAt)
  // 3. Insert new assignment with employee_name + employee_number snapshots
  // 4. Update assets.status = 'assigned'
  // 5. (Task 6) notify + audit
}
```

```typescript
export async function returnAssetAssignment({
  assignmentId,
  returnedAt,
  destination,
  notes,
}: ReturnAssetInput): Promise<void>
```

```typescript
export async function disposeAsset(assetId: string): Promise<void>
```

Use transaction pattern: multiple supabase calls with error rollback (or single RPC if preferred — sequential updates acceptable for v1).

- [ ] **Step 4: Refactor imports**

Update `apps/web/src/app/(hr)/hr/actions.ts` `createAssetAction` to import from `@/lib/assets/` (temporary — full move to dedicated actions file in Task 4).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/assets apps/web/src/lib/hr/assets.ts apps/web/src/app/(hr)/hr/actions.ts
git commit -m "Add asset queries, assignment mutations, and register filter parsing."
```

---

### Task 4: HR assets register + create/edit

**Files:**
- Create: `apps/web/src/app/(hr)/hr/assets/actions.ts`
- Create: `apps/web/src/components/hr/assets/asset-register-filters.tsx`
- Create: `apps/web/src/components/hr/assets/create-asset-form.tsx` (move/refactor from `components/hr/create-asset-form.tsx`)
- Create: `apps/web/src/components/hr/assets/asset-custom-fields.tsx`
- Modify: `apps/web/src/app/(hr)/hr/assets/page.tsx`
- Remove: `apps/web/src/components/hr/create-asset-form.tsx` after move

**Interfaces:**
- Consumes: `listAssetCategories`, `listAssets`, `listActiveEmployeesForSelect`, `listBranches` (existing org queries)
- Produces: `createAssetAction`, `updateAssetAction` server actions

- [ ] **Step 1: Create `assets/actions.ts`**

Move `createAssetAction` from `hr/actions.ts`. Add:

```typescript
export async function createAssetAction(prev: HrActionState, formData: FormData): Promise<HrActionState>
export async function updateAssetAction(prev: HrActionState, formData: FormData): Promise<HrActionState>
```

Parse with Zod schemas; validate `custom_values` via domain helper; on create with assignee call `assignAsset` after insert.

- [ ] **Step 2: Build `asset-custom-fields.tsx`**

Client component: given `fieldSchema` + `defaultValues`, render dynamic inputs. Used by create form and edit form on detail page.

- [ ] **Step 3: Upgrade register page**

`page.tsx`:
- `searchParams` for filters
- `AssetRegisterFilters` form (GET submit)
- `ListCard` rows link to `/hr/assets/[id]`
- Columns: Asset, Category, Status, Branch, Assigned to, Issued
- Status badge colors: available=muted, assigned=primary, returned=warning, disposed=destructive

- [ ] **Step 4: Update create form**

Category `<select>` loads from `listAssetCategories({ activeOnly: true })`. On change, show custom fields. Fields: name, serial, branch, condition, purchase date/value, warranty, notes, optional assignee + issued date.

- [ ] **Step 5: Remove old create form path**

Delete `components/hr/create-asset-form.tsx`; update imports.

- [ ] **Step 6: Manual verify**

HR: create laptop with IMEI custom field, assign to employee, appears in filtered list.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(hr)/hr/assets apps/web/src/components/hr/assets
git commit -m "Upgrade HR asset register with filters and category-driven create form."
```

---

### Task 5: HR asset detail + lifecycle actions

**Files:**
- Create: `apps/web/src/app/(hr)/hr/assets/[assetId]/page.tsx`
- Create: `apps/web/src/components/hr/assets/asset-detail-view.tsx`
- Create: `apps/web/src/components/hr/assets/asset-assignment-timeline.tsx`
- Create: `apps/web/src/components/hr/assets/assign-asset-dialog.tsx`
- Create: `apps/web/src/components/hr/assets/return-asset-dialog.tsx`
- Modify: `apps/web/src/app/(hr)/hr/assets/actions.ts` — add assign, return, dispose, resolve request actions

**Interfaces:**
- Consumes: `getAssetDetail`, `listAssetAssignments`, `assignAsset`, `returnAssetAssignment`, `disposeAsset`
- Produces: `assignAssetAction`, `returnAssetAction`, `disposeAssetAction`, `resolveAssetRequestAction`

- [ ] **Step 1: Detail page**

Load `getAssetDetail(assetId)`; 404 if missing. Sections:
- Summary card (status badge, category, branch, serial, condition, purchase, warranty, notes)
- Custom fields read-only display
- Current assignee + acknowledge status if assigned
- Action buttons: Assign/Reassign, Return (if assigned), Dispose, Edit (inline or link to edit mode)

- [ ] **Step 2: Assignment timeline component**

Vertical list from `listAssetAssignments`, newest first. Each row:
- Snapshotted name + employee number (link to `/hr/employees/[id]` if `employee_id` still exists)
- Assigned at → Returned at (or "Present")
- Acknowledged badge
- Assigned by / returned by (if available)

- [ ] **Step 3: Assign dialog**

Employee select + assigned date + notes → `assignAssetAction`.

- [ ] **Step 4: Return dialog**

Return date, destination radio (`to_inventory` | `pending_inspection`), notes → `returnAssetAction`.

- [ ] **Step 5: Open requests panel**

Show `openRequests` from detail; HR **Resolve** button → `resolveAssetRequestAction` sets status `resolved`.

- [ ] **Step 6: Manual verify**

Reassign asset; confirm two timeline rows with correct names. Return to inventory; status → available.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(hr)/hr/assets/[assetId] apps/web/src/components/hr/assets/asset-detail*
git commit -m "Add HR asset detail page with assignment timeline and lifecycle actions."
```

---

### Task 6: Notifications + audit

**Files:**
- Create: `apps/web/src/lib/assets/audit.ts`
- Create: `apps/web/src/lib/assets/notifications.ts`
- Modify: `apps/web/src/lib/assets/assignments.ts` — wire notify + audit
- Modify: `apps/web/src/lib/assets/categories.ts` — wire audit
- Modify: `apps/web/src/lib/notifications/links.ts` — asset templates
- Modify: `apps/web/src/lib/notifications/placeholders.ts` — optional sample copy

**Interfaces:**
- Produces: `logAssetEvent(action, resourceId, metadata?)`
- Produces: `notifyAssetAssigned()`, `notifyAssetReturned()`, `notifyAssetRequestToHr()`

- [ ] **Step 1: Audit wrapper**

```typescript
export async function logAssetEvent(
  action: string,
  resourceType: "asset" | "asset_category" | "asset_request",
  resourceId: string,
  metadata?: Record<string, unknown>,
): Promise<void>
```

- [ ] **Step 2: Notification helpers**

```typescript
export async function notifyAssetAssigned(input: {
  organizationId: string;
  employeeUserId: string | null;
  assetId: string;
  assetName: string;
}): Promise<void>
```

Use `queueNotification` with templates:
- `asset.assigned` — payload `{ assetId, assetName, href: "/employee/assets/[id]" }`
- `asset.returned` — same href pattern
- `asset.request` — HR recipients: query org HR admin user IDs (same pattern as document compliance HR notify)

- [ ] **Step 3: Extend `resolveNotificationHref`**

```typescript
if (row.template === "asset.assigned" || row.template === "asset.returned") {
  if (portal !== "employee") return null;
  const assetId = row.payload.assetId;
  if (typeof assetId === "string") return `/employee/assets/${assetId}`;
  return "/employee/assets";
}

if (row.template === "asset.request") {
  if (portal !== "hr") return null;
  const assetId = row.payload.assetId;
  if (typeof assetId === "string") return `/hr/assets/${assetId}`;
  return "/hr/assets";
}
```

- [ ] **Step 4: Wire into assignment + request flows**

Call notify + audit after successful assign, return, dispose, acknowledge, request create, category CRUD.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/assets/audit.ts apps/web/src/lib/assets/notifications.ts \
  apps/web/src/lib/assets/assignments.ts apps/web/src/lib/notifications/links.ts
git commit -m "Add in-app asset notifications and audit logging."
```

---

### Task 7: Employee assets detail + requests + acknowledge

**Files:**
- Create: `apps/web/src/lib/assets/requests.ts`
- Create: `apps/web/src/app/(employee)/employee/assets/actions.ts`
- Create: `apps/web/src/app/(employee)/employee/assets/[assetId]/page.tsx`
- Create: `apps/web/src/components/employee/assets/employee-asset-detail.tsx`
- Modify: `apps/web/src/app/(employee)/employee/assets/page.tsx`
- Modify: `apps/web/src/lib/employee/catalog.ts` — delegate to `listMyAssets` in `lib/assets/queries.ts`

**Interfaces:**
- Produces: `listMyAssets()`, `getMyAssetDetail(assetId)`
- Produces: `acknowledgeAssetAction`, `createAssetRequestAction`
- Produces: `acknowledgeAssignment(assignmentId)`, `createAssetRequest(input)`

- [ ] **Step 1: Employee queries**

`listMyAssets` — join `asset_assignments` (active) → `assets` → `asset_categories`. Only current user's assignments.

`getMyAssetDetail` — verify active assignment for session employee; include `acknowledgedAt`, `openRequest` flags.

- [ ] **Step 2: Acknowledge mutation**

```typescript
export async function acknowledgeAssignment(assignmentId: string): Promise<void> {
  // verify employee owns active assignment
  // set acknowledged_at = now()
  // log asset.acknowledged
}
```

- [ ] **Step 3: Request mutation**

```typescript
export async function createAssetRequest(input: {
  assetId: string;
  kind: "issue" | "return" | "replacement";
  message?: string;
}): Promise<void>
```

Block duplicate open request of same kind per asset. Notify HR.

- [ ] **Step 4: Employee detail UI**

- Asset info + custom fields (read-only)
- **Acknowledge receipt** button (hidden if `acknowledged_at` set)
- Three request forms (or tabbed): Report issue, Request return, Request replacement
- Show "Pending" badge if open request exists

- [ ] **Step 5: Update list page**

Link rows to `/employee/assets/[id]`. Show acknowledge pending indicator on list if not acknowledged.

- [ ] **Step 6: Manual verify**

Login as employee with assigned asset: acknowledge, submit issue request; login as HR — notification appears, visible on asset detail.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/assets/requests.ts apps/web/src/lib/assets/queries.ts \
  apps/web/src/app/(employee)/employee/assets apps/web/src/components/employee/assets \
  apps/web/src/lib/employee/catalog.ts
git commit -m "Add employee asset detail with acknowledge and request flows."
```

---

### Task 8: HR employee profile offboarding panel

**Files:**
- Create: `apps/web/src/components/hr/employees/employee-assets-panel.tsx`
- Modify: `apps/web/src/app/(hr)/hr/employees/[employeeId]/page.tsx`
- Modify: `apps/web/src/app/(hr)/hr/assets/actions.ts` — support return from profile context

**Interfaces:**
- Consumes: `listActiveAssignmentsForEmployee(employeeId)` (add to `queries.ts`)
- Consumes: `returnAssetAction` (revalidate employee page paths)

- [ ] **Step 1: Query helper**

```typescript
export async function listActiveAssignmentsForEmployee(
  employeeId: string,
): Promise<EmployeeAssetAssignmentRow[]>
```

- [ ] **Step 2: Panel component**

Render on employee profile when assignments.length > 0:
- Warning banner if `employmentStatus` in `notice` | `resigned` | `terminated` and assignments remain
- Table: asset name, serial, category, issued date, acknowledged?
- **Mark returned** per row → small form posting to `returnAssetAction` with `redirectTo=/hr/employees/[id]`

- [ ] **Step 3: Wire into employee page**

Add `<EmployeeAssetsPanel employeeId={...} employmentStatus={...} />` below profile sections.

- [ ] **Step 4: Manual verify**

Employee with assigned asset + terminated status shows warning; mark returned removes from panel.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hr/employees/employee-assets-panel.tsx \
  apps/web/src/app/(hr)/hr/employees/[employeeId]/page.tsx apps/web/src/lib/assets/queries.ts
git commit -m "Add assigned assets offboarding panel on HR employee profile."
```

---

### Task 9: Tests, smoke test, docs

**Files:**
- Create: `tests/integration/assets.test.ts`
- Modify: `scripts/smoke-test.ts`
- Modify: `docs/features.md`
- Modify: `docs/ui-design-inventory.md`
- Modify: `docs/superpowers/specs/2026-07-27-assets-module-design.md` — update §5 current state + §13 exit criteria

- [ ] **Step 1: Integration tests**

```typescript
import { describe, expect, it } from "vitest";

import { assertAssetStatusTransition } from "../../packages/domain/src/assets/status";

describe("asset assignment snapshots", () => {
  it("preserves employee_name when employee_id is null", () => {
    const row = {
      employee_id: null,
      employee_name: "Former Staff",
      employee_number: "EMP-001",
    };
    expect(row.employee_name).toBe("Former Staff");
  });
});

describe("one active assignment rule", () => {
  it("allows only one open assignment per asset", () => {
    const active = [{ returned_at: null }];
    const closed = [{ returned_at: "2026-07-01" }, { returned_at: null }];
    expect(active.filter((a) => !a.returned_at)).toHaveLength(1);
    expect(closed.filter((a) => !a.returned_at)).toHaveLength(1);
  });
});
```

Expand with domain transition tests already in package; integration file documents DB constraint intent.

- [ ] **Step 2: Update smoke test**

In `runAnnouncementsDbChecks` or new `runAssetsDbChecks` phase:
- `asset_categories` table accessible
- `asset_assignments` table accessible
- Unauthenticated `/hr/assets` and `/employee/assets` redirect to login (already may exist — verify)

- [ ] **Step 3: Update docs**

`features.md` §11: mark HR register, assign/return, categories, employee requests ✅.

- [ ] **Step 4: Run verification**

```bash
pnpm exec tsc -p apps/web --noEmit
pnpm exec vitest run packages/domain/src/assets tests/integration/assets.test.ts --maxWorkers=1
set -a && source apps/web/.env.local && set +a && pnpm smoke-test --base-url http://localhost:3000
```

Expected: all pass

- [ ] **Step 5: Browser QA checklist**

| Role | Flow |
|------|------|
| HR | Create category → create asset → assign → detail timeline |
| HR | Reassign → return to inventory → dispose |
| HR | Employee profile offboarding panel |
| Employee | View detail → acknowledge → submit request |
| HR | Resolve request; verify notification links |

- [ ] **Step 6: Update spec exit criteria**

Check all boxes in spec §13.

- [ ] **Step 7: Commit**

```bash
git add tests/integration/assets.test.ts scripts/smoke-test.ts docs/
git commit -m "Add assets tests, smoke checks, and documentation updates."
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Migration + backfill | Task 1 |
| Category catalog + custom fields | Task 2 |
| HR register filters | Task 4 |
| HR detail + timeline | Task 5 |
| Assign / reassign / return / dispose | Tasks 3, 5 |
| Employee detail + acknowledge | Task 7 |
| Employee requests | Task 7 |
| Offboarding panel | Task 8 |
| Notifications | Task 6 |
| Audit | Task 6 |
| No manager portal | — (omitted by design) |
| No email | — (omitted by design) |
| Tests + smoke | Task 9 |

No gaps identified.

---

## Execution order

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9
```

Task 6 can run in parallel with Task 5/7 but wiring is easier after mutations exist — recommended after Task 5, before Task 7.
