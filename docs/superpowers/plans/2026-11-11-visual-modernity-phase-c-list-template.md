# Visual Modernity Phase C — List Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship `PortalListPage` + `PortalFilterChips`; migrate branches/departments/leave-types lists; improve `OrgTableShell` empties with icons.

**Architecture:** Compose around existing `PortalPageHeader` + `OrgTableShell`. Do not replace the table shell.

**Tech Stack:** React, Next.js, existing portal + org-ui primitives.

## Global Constraints

- BukuHR green only; no purple.
- List forms (create/edit) unchanged.
- Workspace strip deferred.

---

### Task 1: PortalListPage + PortalFilterChips

**Files:**
- Create: `apps/web/src/components/portal/portal-list-page.tsx`
- Create: `apps/web/src/components/portal/portal-filter-chips.tsx` (or co-locate)

- [x] **Step 1:** Implement `PortalListPage`
- [x] **Step 2:** Implement `PortalFilterChips` + `PortalFilterChip`

---

### Task 2: OrgTableShell empty icon

- [x] **Step 1:** Optional `emptyIcon`; default organization icon

---

### Task 3: Migrate three list pilots

- [x] **Step 1:** Wrap branches / departments / leave types lists
- [x] **Step 2:** Smoke unit tests pass

---

### Task 4: Verify

- [x] Three lists use `PortalListPage`
- [x] Empties show icon well
- [x] Forms still use `PortalPageHeader` directly
