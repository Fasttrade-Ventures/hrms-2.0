# HRMS Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implemented on `fix/audit-remediation-pr-a` (2026-08-27). Task 11 geofence distance copy closed in Critical/High gap plan; Task 17 SQL aggregates remain optional per `docs/perf-followups.md`.

**Goal:** Close every finding from the Aug 27, 2026 deep role audit (authz, leave/payroll correctness, nav/guard alignment, entitlements, UX polish, and performance) without reintroducing middleware 504 outages.

**Architecture:** Defense in depth — middleware remains a fast edge gate with timeout; portal layouts enforce `requireRole`; pages/actions enforce `requireModule` / business rules. Prefer removing broken nav/middleware exceptions over building incomplete Branch Admin surfaces in this pass. Standalone mode keeps Owner tier edits; SaaS mode locks tier to Platform-only.

**Tech Stack:** Next.js App Router (`apps/web`), Supabase (`createClient` / `createAdminClient`), `@hrms/platform` entitlements, existing Vitest/unit tests under `apps/web` / `packages/*`, Zod where forms already use it.

**Source audit:** Canvas `hrms-deep-audit.canvas.tsx` + ranked findings below.

## Global Constraints

- Do **not** remove `AUTH_TIMEOUT_MS` or health/cron auth bypass — 504 mitigation stays.
- On membership timeout: **fail closed** for portal paths (redirect), never skip `canAccessPath`.
- Prefer `redirect("/unauthorized…")` over throwing from gate helpers (avoids 500).
- Standalone deployment (`DEPLOYMENT_MODE!=saas`): Owner may edit `product_tier`; SaaS: Platform-only.
- Branch Admin completeness (legacy parity) is **out of scope** except removing broken links + a short backlog note.
- Director may **approve** payruns via UI; **lock** remains HR-only.
- Leave policy: empty `employee_allowed_leave_types` continues to mean **all types** (document only; do not flip semantics without data migration).
- Notification placeholders: show only when `NODE_ENV === "development"`.
- Keep commits small and focused per task; do not commit `tsconfig.tsbuildinfo`.
- Match existing code style; no drive-by refactors.

## Locked product decisions

| Topic | Decision |
| --- | --- |
| Middleware timeout | Redirect to `/auth/login?error=session_check_timeout` (or `/unauthorized`) — do not serve portal HTML without membership |
| Impersonation | Synthetic roles stay `organization_owner` + `hr_administrator`; gate banner/stop on cookie + `platform_impersonating` permission |
| Branch Admin docs/calendar | Remove nav + middleware allowlist until branch-scoped pages exist |
| Owner payroll/reports/audit | Remove from Owner nav (Owner keeps dashboard + settings) |
| Apply-behalf | Keep auto-approve; enforce balance + blackout; require override reason when over balance |
| Leave empty allow-list | Document “empty = all”; no semantic change |
| Perf | Paginate / aggregate; no full redesign |

## File map (primary touch points)

| Area | Files |
| --- | --- |
| Middleware / routes | `apps/web/src/lib/supabase/middleware.ts`, `apps/web/src/lib/auth/routes.ts` |
| Portal gates | `apps/web/src/components/portal-layout.tsx`, `apps/web/src/app/(*/layout.tsx` |
| Session / roles | `apps/web/src/lib/auth/session.ts` |
| Impersonation | `apps/web/src/lib/platform/impersonation.ts`, `apps/web/src/components/platform/impersonation-controls.tsx` |
| Nav | `apps/web/src/lib/portal-nav.ts` |
| Leave | `apps/web/src/lib/employee/leave.ts`, employee leave apply UI |
| Apply-behalf | `apps/web/src/lib/hr/apply-behalf.ts`, `apps/web/src/components/hr/apply-behalf/*` |
| Entitlements | `apps/web/src/lib/entitlements.ts`, employee Pro pages under `apps/web/src/app/(employee)/employee/{overtime,claims,payslips,replacement-credit}/**` |
| Payroll | `apps/web/src/lib/payroll/{workflow,generate,edit}.ts`, `apps/web/src/app/(hr)/hr/payroll/actions.ts`, `apps/web/src/components/hr/payroll/payrun-workflow-actions.tsx`, director payroll pages |
| Owner entitlements | `apps/web/src/lib/owner/entitlements.ts`, owner settings UI |
| Manager reassign | `apps/web/src/lib/employees/update-employee.ts`, `apps/web/src/lib/approvals/service.ts` |
| Attendance | `apps/web/src/components/employee/{dashboard-clock-panel,attendance-clock-panel}.tsx`, `apps/web/src/lib/attendance/geofence.ts` |
| Declarations | `apps/web/src/lib/employee/payroll-declarations.ts` |
| Ops override | `apps/web/src/app/(hr)/hr/operations/actions.ts` |
| Notifications | `apps/web/src/components/notifications/notifications-list.tsx`, portal notification pages |
| Analytics / lists | HR analytics + payroll detail query modules (locate via `rg` during Task 17) |

## Coverage checklist (every audit row)

| Finding | Task | Status |
| --- | --- | --- |
| Middleware fail-open / 504 tradeoff | 1 | DONE |
| Portal layouts only `requireAuth` | 1 | DONE |
| Impersonation exit broken | 2 | DONE |
| Branch Admin broken HR deep-links | 3 | DONE |
| Owner nav unauthorized | 4 | DONE |
| Owner tier self-upgrade (SaaS) | 4 | DONE |
| Leave balance not enforced | 5 | DONE |
| Apply-behalf no balance/blackout | 6 | DONE |
| Employee Pro URL bypass | 7 | DONE |
| `requireModule` throws 500 | 7 | DONE |
| Duty segregation incomplete | 8 | DONE |
| Director approve without UI / lock mismatch | 9 | DONE |
| Manager approver stale | 10 | DONE |
| Attendance labels / geofence UX | 11 | DONE |
| Unbounded payroll declarations | 12 | DONE |
| HR override comment/audit | 13 | DONE |
| Empty leave types = all (document) | 14 | DONE |
| Notification placeholders | 15 | DONE |
| Platform tenants nav in standalone | 16 | DONE |
| Heavy analytics / unpaginated lists | 17 | PARTIAL (pagination done; SQL aggregates optional) |
| Branch Admin thin / incomplete | 3 + 18 | DONE (remaining enhancements in branch-admin-backlog) |

---

### Task 1: Middleware fail-closed + portal `requireRole`

**Files:**
- Modify: `apps/web/src/lib/supabase/middleware.ts`
- Modify: `apps/web/src/components/portal-layout.tsx`
- Modify: `apps/web/src/app/(employee)/layout.tsx`, `(manager)/layout.tsx`, `(hr)/layout.tsx`, `(branch-admin)/layout.tsx`, `(director)/layout.tsx`, `(owner)/layout.tsx`, `(auditor)/layout.tsx`, `(platform)/layout.tsx`
- Test: manual curl + unit if routes tests exist; smoke login

**Interfaces:**
- Consumes: existing `canAccessPath`, `requireRole`, `PortalLayout` `portal` string
- Produces: `PORTAL_REQUIRED_ROLES` map; layouts that cannot be entered without role even if middleware times out

- [ ] **Step 1: Change membership-timeout behavior in middleware**

In `updateSession`, when `user && !isPublicPath && !api` and `getMembership` returns `null` (timeout or missing), **do not** `return supabaseResponse`. Redirect:

```ts
const url = request.nextUrl.clone();
url.pathname = "/auth/login";
url.searchParams.set("error", "session_check_timeout");
return NextResponse.redirect(url);
```

Keep the same for `/` home redirect when membership is null (redirect login with same error), so home does not skip role routing forever.

Keep `AUTH_TIMEOUT_MS`, health/cron bypass, and existing `canAccessPath` when membership **is** present.

- [ ] **Step 2: Add portal → roles map and enforce in `PortalLayout`**

```ts
const PORTAL_ROLES: Record<string, string[]> = {
  Employee: ["employee", "manager", "hr_administrator", "branch_admin", "director", "organization_owner", "auditor", "platform_administrator"],
  Manager: ["manager"],
  "HR Administrator": ["hr_administrator"],
  "Branch Admin": ["branch_admin"],
  Director: ["director"],
  Owner: ["organization_owner"],
  Auditor: ["auditor"],
  Platform: ["platform_administrator"],
};
```

**Important:** Employee portal is often used by multi-role users. Prefer matching how `canAccessPath` already treats `/employee` (read `apps/web/src/lib/auth/routes.ts` and mirror **exactly** — do not invent a looser set). Call `requireRole(...roles)` with the same role list middleware uses for that portal prefix.

Alternatively (cleaner): pass `requiredRoles` from each layout:

```tsx
// apps/web/src/app/(hr)/layout.tsx
return <PortalLayout portal="HR Administrator" requiredRoles={["hr_administrator"]}>{children}</PortalLayout>;
```

```ts
// portal-layout.tsx
export async function PortalLayout({ portal, requiredRoles, children }: {
  portal: string;
  requiredRoles: string[];
  children: ReactNode;
}) {
  await requireRole(...requiredRoles);
  // ...existing
}
```

Impersonation sessions use synthetic `organization_owner` + `hr_administrator` — Owner/HR layouts must still work.

- [ ] **Step 3: Wire every portal layout with `requiredRoles`**

Mirror `routes.ts` prefixes. Auditor may use permission-based access — if auditor portal is permission-gated today, use `requireRoleOrPermission` from `session.ts` instead of roles-only.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @hrms/web exec tsc --noEmit` (or repo’s usual typecheck).  
Manual: unauthenticated `/employee/dashboard` → login; HR user cannot open `/owner/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/supabase/middleware.ts apps/web/src/components/portal-layout.tsx apps/web/src/app/\(*\)/layout.tsx
git commit -m "$(cat <<'EOF'
fix: fail closed on membership timeout and require portal roles

EOF
)"
```

---

### Task 2: Fix platform impersonation exit / banner

**Files:**
- Modify: `apps/web/src/lib/auth/session.ts` (`loadMembership` impersonation branch)
- Modify: `apps/web/src/lib/platform/impersonation.ts` (`getImpersonationState`, `stopImpersonation`)
- Test: SaaS-only behavior; standalone already blocks start

**Interfaces:**
- Consumes: `IMPERSONATION_COOKIE`, `platform_impersonating` permission
- Produces: stop/banner work while synthetic roles are owner+HR

- [ ] **Step 1: Keep synthetic roles; ensure permission flag**

In `loadMembership` when impersonating:

```ts
return {
  organizationId: impersonateOrgId,
  employeeId: null,
  roles: ["organization_owner", "hr_administrator"],
  permissions: ["platform_impersonating"],
};
```

(Already present — verify it stays.)

- [ ] **Step 2: Gate banner on permission + cookie, not `platform_administrator` role**

```ts
export async function getImpersonationState(session: {
  membership: { roles: string[]; permissions: string[] };
}): Promise<...> {
  const organizationId = await getImpersonationOrgId();
  if (!organizationId) return null;
  if (!session.membership.permissions.includes("platform_impersonating")) return null;
  // ...load org name via admin client
}
```

- [ ] **Step 3: Fix `stopImpersonation`**

Do **not** call `requireRole("platform_administrator")`. Instead:

```ts
export async function stopImpersonation(): Promise<void> {
  const session = await requireAuth();
  const organizationId = await getImpersonationOrgId();
  if (!organizationId || !session.membership.permissions.includes("platform_impersonating")) {
    redirect("/unauthorized");
  }
  // delete cookie, audit, redirect /platform/tenants
}
```

Optionally add `requirePermission("platform_impersonating")` helper in `session.ts` if missing.

- [ ] **Step 4: Verify**

With SaaS + impersonation cookie set: banner visible; Exit clears cookie and lands on `/platform/tenants`.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: allow exit impersonation while synthetic tenant roles are active

EOF
)"
```

---

### Task 3: Branch Admin — remove broken HR deep-links

**Files:**
- Modify: `apps/web/src/lib/portal-nav.ts` (Branch Admin section ~documents/calendar)
- Modify: `apps/web/src/lib/auth/routes.ts` (branch_admin HR documents/calendar exception)
- Leave: Branch Admin pages as-is (dashboard + employees)

**Decision:** Do not build branch-scoped documents/calendar in this plan.

- [ ] **Step 1: Remove Branch Admin nav items** pointing at `/hr/documents` and `/hr/calendar`.

- [ ] **Step 2: Remove middleware allowlist** in `canAccessPath` / routes that lets `branch_admin` into those HR paths.

- [ ] **Step 3: Confirm Branch Admin still reaches `/branch-admin/dashboard` and employees list.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: remove Branch Admin links to HR-only documents and calendar

EOF
)"
```

---

### Task 4: Owner nav alignment + SaaS tier gate

**Files:**
- Modify: `apps/web/src/lib/portal-nav.ts` (Owner section: payroll/reports/audit)
- Modify: `apps/web/src/lib/owner/entitlements.ts` (`updateOwnerProductTier`)
- Modify: Owner settings action/UI that calls tier update
- Modify: `apps/web/src/app/(owner)/owner/actions.ts` if needed

- [ ] **Step 1: Remove Owner nav links** to `/hr/payroll`, `/hr/reports`, `/hr/audit` (and children). Keep Owner dashboard + settings (+ entitlements UI).

- [ ] **Step 2: Gate tier updates**

```ts
import { isSaasMode } from "@hrms/platform";

export async function updateOwnerProductTier(tier: ProductTier, actorUserId?: string | null) {
  if (isSaasMode()) {
    throw new Error("Product tier can only be changed by Platform in SaaS mode.");
  }
  // existing update
}
```

Hide or disable tier selector in Owner UI when `isSaasMode()`.

- [ ] **Step 3: Verify** Owner settings still toggles module flags; tier control hidden/blocked in SaaS.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: align Owner nav with page guards and lock SaaS tier edits

EOF
)"
```

---

### Task 5: Enforce leave balance on create

**Files:**
- Modify: `apps/web/src/lib/employee/leave.ts` (`createLeaveRequest`, reuse balance helpers from `getLeaveBalances`)
- Modify: employee leave apply client form (disable submit / show error when over balance)
- Test: add unit test for day calc + balance gate if leave tests exist; else add focused test under `apps/web`

- [ ] **Step 1: Extract or reuse balance for one type**

Before insert in `createLeaveRequest`:

```ts
const balances = await getLeaveBalances(); // or internal helper that accepts employeeId
const balance = balances.find((b) => b.leaveTypeId === input.leaveTypeId);
const { data: typeRow } = await supabase
  .from("leave_types")
  .select("name, is_unpaid")
  .eq("id", input.leaveTypeId)
  .maybeSingle();

if (!typeRow?.is_unpaid) {
  const remaining = balance?.remainingDays ?? 0;
  if (days > remaining) {
    throw new Error(`Insufficient leave balance. Remaining: ${remaining} day(s).`);
  }
}
```

Ensure `getLeaveBalances` path used here does not double-count the request being created.

- [ ] **Step 2: Mirror check in apply UI** using remaining from page props (client-side UX only; server remains authority).

- [ ] **Step 3: Manual / test** — apply more days than remaining → error; unpaid type allowed.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: reject leave requests that exceed remaining entitlement

EOF
)"
```

---

### Task 6: Apply-behalf — blackout + balance + override reason

**Files:**
- Modify: `apps/web/src/lib/hr/apply-behalf.ts` (create leave-on-behalf ~auto-approve insert)
- Modify: `apps/web/src/components/hr/apply-behalf/apply-behalf-ui.tsx` (+ actions)
- Reuse: `assertLeaveDatesAllowed` from `@/lib/leave/blackout`, balance logic from Task 5 (extract shared `assertLeaveBalance(organizationId, employeeId, leaveTypeId, days)` into `apps/web/src/lib/leave/balance.ts` if both call sites need it)

**Interfaces:**
- Produces: `assertLeaveBalance(...)` shared helper used by Task 5–6

- [ ] **Step 1: Prefer extracting shared balance assert** (refactor Task 5 helper if not already).

- [ ] **Step 2: In apply-behalf leave create**, before insert with `status: "approved"`:

1. `await assertLeaveDatesAllowed(...)`
2. Compute days
3. If over balance: require non-empty `overrideReason` from form; else throw
4. Insert; include override reason in audit metadata (`hr.apply_behalf`)

- [ ] **Step 3: Add required “Override reason” field** in UI when days > remaining (or always show optional; required only when over).

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: enforce blackout and leave balance on HR apply-behalf

EOF
)"
```

---

### Task 7: Employee Pro `requireModule` + soft fail redirect

**Files:**
- Modify: `apps/web/src/lib/entitlements.ts`
- Modify pages:
  - `apps/web/src/app/(employee)/employee/overtime/**/page.tsx`
  - `.../claims/**/page.tsx`
  - `.../payslips/**/page.tsx`
  - `.../replacement-credit/**/page.tsx`
- Also gate matching **server actions** / lib entrypoints if they lack module checks

- [ ] **Step 1: Change `requireModule` / `requireProfessionalTier`**

```ts
import { redirect } from "next/navigation";

export async function requireModule(module: ModuleKey): Promise<void> {
  const entitlements = await getEntitlements();
  if (!entitlements.hasModule(module)) {
    redirect(`/unauthorized?reason=module&module=${module}`);
  }
}
```

Same pattern for `requireProfessionalTier` → `reason=tier`.

- [ ] **Step 2: Add page gates**

| Path | Module |
| --- | --- |
| overtime | `ot` |
| claims | `claims` |
| payslips | `payroll` |
| replacement-credit | `replacement` |

```ts
await requireModule("ot");
```

- [ ] **Step 3: Verify** with Core-tier org (or module_flags false): direct URL → `/unauthorized`, not 500.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: gate employee Pro pages with requireModule and redirect on deny

EOF
)"
```

---

### Task 8: Payroll duty segregation completeness

**Files:**
- Modify: `apps/web/src/lib/payroll/generate.ts` (or wherever payrun row is inserted/updated on generate)
- Modify: `apps/web/src/lib/payroll/workflow.ts` (`submitPayrunForReview`, `approvePayrun`)
- Modify: `apps/web/src/lib/hr/payroll.ts` (`lockPayrun`)
- Modify: Owner settings UI + `apps/web/src/lib/owner/*` or org settings to toggle `organizations.payroll_duty_segregation`
- Modify: `apps/web/src/app/(hr)/hr/payroll/actions.ts` if lock guard changes here vs Task 9

- [ ] **Step 1: Set `last_edited_by` on generate and on submit-for-review** to `actorUserId`.

- [ ] **Step 2: When `payroll_duty_segregation` is true:**
  - `approvePayrun`: reject if `actorUserId === last_edited_by` (already partially there — verify generate populates field)
  - `lockPayrun`: also reject if same user as `last_edited_by` **or** same as approver if you store `approved_by` — minimum: editor cannot lock their own run

- [ ] **Step 3: Owner UI toggle** for `payroll_duty_segregation` (boolean on `organizations`), with audit log.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: complete payroll duty segregation and expose Owner toggle

EOF
)"
```

---

### Task 9: Director approve UI + HR-only lock

**Files:**
- Modify: `apps/web/src/app/(hr)/hr/payroll/actions.ts` (`lockPayrunAction` guard)
- Modify: Director payroll UI components (find via `rg "director" apps/web/src/app/\(director\)` and payrun detail shared component)
- Modify: `apps/web/src/components/hr/payroll/payrun-workflow-actions.tsx` (role-aware buttons)

- [ ] **Step 1: Split guards**

```ts
async function guardPayrollApprover() {
  return requireRoleOrPermission(["hr_administrator", "director"], ["payroll_approver"]);
}
async function guardPayrollLocker() {
  return requireRole("hr_administrator");
}
```

`approvePayrunAction` → `guardPayrollApprover`; `lockPayrunAction` → `guardPayrollLocker`.

- [ ] **Step 2: Show Approve button for Director** on payruns in `submitted`/`pending_approval` state; hide Lock for non-HR.

- [ ] **Step 3: Verify** Director can approve via UI; Lock returns unauthorized for Director.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: expose Director payrun approve and restrict lock to HR

EOF
)"
```

---

### Task 10: Reassign pending approvals when manager changes

**Files:**
- Modify: `apps/web/src/lib/employees/update-employee.ts` (when `manager_employee_id` changes)
- Possibly: `apps/web/src/lib/approvals/service.ts` (helper to reassign pending steps)
- Schema: confirm `approval_steps` columns (`approver_employee_id`, `status`)

- [ ] **Step 1: Add helper**

```ts
export async function reassignPendingApprovalsForManagerChange(params: {
  organizationId: string;
  oldManagerEmployeeId: string | null;
  newManagerEmployeeId: string | null;
  reportEmployeeIds: string[]; // employees whose manager changed; or single employeeId
}): Promise<void>
```

Update pending steps where `approver_employee_id === oldManagerEmployeeId` and the request belongs to the affected report(s) → set to `newManagerEmployeeId`. If new manager is null, leave steps but flag in audit (or assign HR fallback — prefer: assign new manager only; if null, keep old and audit warning).

- [ ] **Step 2: Call from `update-employee`** after successful manager field update.

- [ ] **Step 3: Audit** `approvals.reassigned_manager_change`.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: reassign pending approval steps when an employee manager changes

EOF
)"
```

---

### Task 11: Attendance session labels + geofence messaging

**Files:**
- Modify: `apps/web/src/components/employee/dashboard-clock-panel.tsx`
- Modify: `apps/web/src/components/employee/attendance-clock-panel.tsx`
- Modify: shared distance helper (reuse or export from `apps/web/src/lib/attendance/geofence.ts`)

- [ ] **Step 1: Unify copy** for between-sessions / “Clock In Again” on both panels (same strings).

- [ ] **Step 2: Client distance messaging** — if geofence enabled and browser coords available, compute distance with same formula as server; show “Outside range (~Xm)” vs “Within range”. **Never** bypass server checks.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: align attendance session labels and geofence distance messaging

EOF
)"
```

---

### Task 12: Validate payroll declarations

**Files:**
- Modify: `apps/web/src/lib/employee/payroll-declarations.ts`
- Modify: employee profile/declarations form if it posts raw numbers

- [ ] **Step 1: Add Zod schema** (or shared validators)

```ts
const declarationsSchema = z.object({
  zakatAnnual: z.number().min(0).max(1_000_000),
  zakatMonthly: z.number().min(0).max(100_000),
  otherReliefs: z.number().min(0).max(1_000_000),
  voluntaryEpfExtraRate: z.number().min(0).max(0.2), // clamp 0–20%
});
```

Reject NaN; clamp or error on over-max (prefer error with clear message).

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: bound employee payroll declaration inputs with validation

EOF
)"
```

---

### Task 13: HR operations override — comment + audit

**Files:**
- Modify: `apps/web/src/app/(hr)/hr/operations/actions.ts`
- Modify: operations step UI form

- [ ] **Step 1: Require non-empty `comment`** (trim length ≥ 3) for approve/reject when `hrOverride: true`.

- [ ] **Step 2: Distinct audit actions** e.g. `hr.operations.override_approve` / `override_reject` with comment in metadata.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: require comment and distinct audit for HR approval overrides

EOF
)"
```

---

### Task 14: Document empty leave-type allow-list policy

**Files:**
- Modify: HR employee create/edit UI help text near leave-type multi-select
- Optionally: one-line comment above `listLeaveTypes` in `apps/web/src/lib/employee/leave.ts`

- [ ] **Step 1: Add UI helper text:** “If no leave types are selected, the employee can apply for all organization leave types.”

- [ ] **Step 2: Code comment documenting intentional semantics (empty = all).

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: clarify empty leave-type allow-list means all types

EOF
)"
```

---

### Task 15: Notification placeholders only in development

**Files:**
- Modify: `apps/web/src/app/(employee)/employee/notifications/page.tsx`
- Modify: `apps/web/src/app/(manager)/manager/notifications/page.tsx`
- Modify: HR notifications page if it uses placeholders
- Modify: `apps/web/src/components/notifications/notifications-list.tsx` (belt-and-suspenders)

- [ ] **Step 1: Pass placeholders only when** `process.env.NODE_ENV === "development"`.

```ts
placeholderNotifications={
  process.env.NODE_ENV === "development"
    ? getPlaceholderNotifications("employee")
    : []
}
```

- [ ] **Step 2: Empty inbox shows empty state**, not sample rows, in production.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: hide notification placeholder samples outside development

EOF
)"
```

---

### Task 16: Hide Platform tenants nav in standalone

**Files:**
- Modify: `apps/web/src/lib/portal-nav.ts` and/or `getPortalNavSectionsForEntitlements` callers
- Modify: `apps/web/src/components/portal-layout.tsx` if nav needs `isSaasMode()`

- [ ] **Step 1: Filter out `/platform/tenants`** when `!isSaasMode()`.

- [ ] **Step 2: Verify** standalone Platform dashboard still loads; tenants link absent.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: hide Platform tenants nav outside SaaS mode

EOF
)"
```

---

### Task 17: Performance — aggregates + pagination

**Files:** (confirm with `rg` at start of task)
- HR analytics data loaders under `apps/web/src/lib/**` and director analytics pages
- Payrun detail line fetch in `apps/web/src/lib/payroll/**` / HR payroll detail page
- Soft-capped list queries (employees, documents, approvals) — add real `.range()` pagination + “showing first N” banner when truncated

- [ ] **Step 1: Inventory top offenders** with `rg "limit\\(5000\\)|limit\\(500\\)|\\.select\\(\\*\\)" apps/web/src/lib` and analytics pages; list concrete files in the PR description.

- [ ] **Step 2: Analytics** — replace load-all-employees + all-leave-in-memory with SQL aggregates / grouped counts (Supabase RPC or narrow selects with `count` / date filters).

- [ ] **Step 3: Payrun detail** — paginate lines (e.g. 50–100 per page) with URL `?page=`.

- [ ] **Step 4: Directory/list pages** — replace soft cap silence with pagination or explicit “Showing first 500 of N” when `count` > page size.

- [ ] **Step 5: Smoke** HR analytics + large payrun on staging/demo; confirm TTFB improvement subjectively.

- [ ] **Step 6: Commit** (may split into 2 commits: analytics vs payrun/lists)

```bash
git commit -m "$(cat <<'EOF'
perf: paginate heavy payroll/analytics queries and surface truncation

EOF
)"
```

---

### Task 18: Branch Admin completeness backlog (docs only)

**Files:**
- Create: `docs/branch-admin-backlog.md`

- [ ] **Step 1: Write scoped backlog** mirroring legacy needs: branch-scoped documents, calendar, apply-behalf, reports — each with suggested route under `/branch-admin/...` and RLS/org branch filter notes. Explicitly state removed deep-links from Task 3.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: capture Branch Admin parity backlog after removing broken links

EOF
)"
```

---

## Suggested PR / release slicing

| PR | Tasks | Risk |
| --- | --- | --- |
| PR-A Authz | 1–4, 16 | High — test all roles |
| PR-B Leave & entitlements | 5–7, 14 | Medium |
| PR-C Payroll | 8–9 | Medium — segregation edge cases |
| PR-D Manager & ops | 10, 13 | Medium |
| PR-E UX polish | 11–12, 15 | Low |
| PR-F Perf | 17 | Medium — query changes |
| PR-G Docs | 18 | Low |

Ship **PR-A before** anything else on production.

## Verification matrix (end of plan)

| Role | Smoke |
| --- | --- |
| Employee | Leave over-balance blocked; Pro URL gated; attendance labels; declarations validation; notifications empty |
| Manager | Approvals inbox; after manager change, pending steps move |
| HR | Apply-behalf balance/blackout; override comment; payroll segregate; lists paginated |
| Branch Admin | No HR documents/calendar links; dashboard works |
| Director | Approve visible; lock denied |
| Owner | No broken HR nav; tier edit only standalone |
| Auditor | Audit pages still open |
| Platform | Tenants hidden standalone; impersonation exit works in SaaS |
| Auth | Membership timeout → login error, not open portal |

## Self-review

- Spec coverage: all listed findings map to Tasks 1–18.
- No intentional TBD left; Branch Admin full build deferred to Task 18 backlog by design.
- Impersonation uses `platform_impersonating` consistently in Tasks 1–2.
- Shared leave balance helper introduced in Task 5/6 boundary.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-27-audit-remediation.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach — and should we start with **PR-A (Tasks 1–4, 16)** first?
