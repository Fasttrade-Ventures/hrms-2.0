# Visual Modernity Phase A Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Page-owned single H1 across all portals; shell top bar no longer competes as a title.

**Architecture:** Flip the existing a11y convention (shell was the only h1). Demote shell label to context text; promote `PortalPageHeader` and custom page titles to h1; add headers on pages that had none.

**Tech Stack:** Next.js App Router, React, existing portal components.

## Global Constraints

- Keep BukuHR green / Forest Sage tokens — no purple wash.
- Do not invent features; chrome/consistency only.
- Phase B/C deferred.

---

### Task 1: Flip shell + PortalPageHeader heading roles

**Files:**
- Modify: `apps/web/src/components/portal-shell.tsx`
- Modify: `apps/web/src/components/portal/portal-primitives.tsx`
- Modify: `tests/unit/high-severity-fixes.test.ts`

- [x] **Step 1: Update the failing unit test for page-owned H1**

In `tests/unit/high-severity-fixes.test.ts`, replace the “signed-in pages have one h1” block so it expects:
- `PortalPageHeader` contains `<h1` and not `<h2`
- `portal-shell.tsx` does **not** contain `<h1`
- Employee dashboard / leave / report-runner may contain `<h1` if they are the page title (assert at most that shell has no h1; drop “source must not contain h1” for those files, or assert they use h1 once)

- [x] **Step 2: Run test to verify it fails** (executed during implementation)

- [x] **Step 3: Demote shell title; promote PortalPageHeader**

- [x] **Step 4: Run test to verify it passes**

---

### Task 2: Promote custom page titles + fill header gaps

**Files:**
- Modify: `apps/web/src/components/hr/dashboard/hr-dashboard-hero.tsx` (h2 → h1)
- Modify: `apps/web/src/app/(employee)/employee/dashboard/page.tsx` (greeting h2 → h1)
- Modify: `apps/web/src/app/(employee)/employee/leave/page.tsx` (h2 → h1 if present)
- Modify: `apps/web/src/components/hr/employees/employee-list.tsx` (directory h2 → h1)
- Modify: `apps/web/src/components/hr/organization/organization-hub.tsx` (hub h2 → h1 if present)
- Modify: `apps/web/src/components/reports/report-runner.tsx` (keep h2 — sits under PortalPageHeader)
- Modify: `NotificationsList` — add `PortalPageHeader title="Notifications"`

- [x] **Step 1: Promote known custom titles to h1**

- [x] **Step 2: Add PortalPageHeader to notifications entry points**

- [x] **Step 3: Re-run unit test + smoke key routes mentally**

---

### Task 3: Verify

- [x] **Step 1:** `pnpm exec vitest run tests/unit/high-severity-fixes.test.ts`
- [x] **Step 2:** Confirm no shell `<h1` remains via ripgrep
