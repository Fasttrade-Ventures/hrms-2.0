# BukuHR Visual Modernity — Phase C List Template Design

**Status:** Implemented  
**Parent:** Visual modernity audit; Phase A chrome + Phase B homes/empties implemented  
**Approach:** A — compose `PortalListPage` over existing org stack; migrate branches / departments / leave types

## Goal

One reusable list-page composition so plain org CRUD stops hand-rolling header + stats + table. Soft filter chips available for later pages. Keep `OrgTableShell` as the table body. Keep BukuHR green. No invented features.

## Decisions

| Decision | Choice |
|----------|--------|
| Wave scope | List template + org CRUD pilots |
| Implementation | Compose wrapper; do not replace `OrgTableShell` |
| Workspace strip | Deferred (thin primitive only if free; not required this wave) |
| Filter chips | Ship helper; org pilots may leave filters empty |

## 1. `PortalListPage`

**File (new):** `apps/web/src/components/portal/portal-list-page.tsx`

**API:**

```ts
{
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}
```

**Layout:**
1. `PortalPageHeader` (page `h1`)
2. Optional `stats`
3. Optional `filters`
4. `children` (typically `OrgTableShell`)

**Spacing:** outer `space-y-6` (same as current org list pages).

List **forms** (create/edit) keep using `PortalPageHeader` + `OrgFormCard` directly — not required to use `PortalListPage`.

## 2. `PortalFilterChips`

**File (new):** same module or `portal-filter-chips.tsx`

**API:** soft chip row for link or button filters:

```ts
{
  children: ReactNode; // typically chip items
  className?: string;
}
```

Plus `PortalFilterChip` item:

```ts
{
  href?: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}
```

**Visual:** pill/chip; inactive = muted surface + border; active = soft green (`--surface-accent-soft` / `--accent-primary`), not heavy filled purple. Prefer links when `href` is set (compatible with existing `HrFilterButton` call sites later).

Org pilots this wave: **filters slot unused** unless a page already has filters (none of the three do today).

## 3. Org pilots

Migrate **list** views only:

| List | File |
|------|------|
| Branches | `apps/web/src/components/hr/organization/branches.tsx` → `BranchesList` |
| Departments | `apps/web/src/components/hr/organization/departments.tsx` → list component |
| Leave types | `apps/web/src/components/hr/organization/leave-types.tsx` → list component |

Replace hand-rolled `<div className="space-y-6">` + `PortalPageHeader` + stats + shell with:

```tsx
<PortalListPage title="…" description="…" actions={…} stats={<OrgStatCards … />}>
  <OrgTableShell …>…</OrgTableShell>
</PortalListPage>
```

## 4. `OrgTableShell` empties

**File:** `apps/web/src/components/hr/organization/org-ui.tsx`

- Pass optional `emptyIcon?: ReactNode` into `OrgTableShell` (or default to `PortalIcon name="organization"` when unset).
- Wire icon into Phase B `EmptyState`.
- Keep existing empty titles; tweak descriptions only if needed for friendliness (short, one next step).

Per-pilot icons (suggested):
- Branches / departments / leave types → `organization` (or leave/employees where clearer)

## 5. Out of scope

- Replacing `OrgTableShell` with `@hrms/ui` `ListCard`
- Migrating payroll, leave/attendance reports, documents library
- Full workspace-strip rollout beyond recruitment desk
- Migrating all remaining org entities (claim types, positions, etc.) — can follow same pattern later

## Success criteria

1. `PortalListPage` and `PortalFilterChips` exist and are used by the three org list pilots
2. Those lists no longer duplicate header/stats stacking by hand
3. `OrgTableShell` empties show the Phase B icon well
4. Create/edit org forms unchanged in behavior
5. Green tokens only; no purple
