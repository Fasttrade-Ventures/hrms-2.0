# BukuHR Visual Modernity — Phase B Homes & Empties Design

**Status:** Implemented  
**Parent:** Visual modernity audit; Phase A chrome implemented  
**Approach:** A — shared empty polish + reorder HR/employee homes

## Goal

Make signed-in homes feel task- and people-led (not KPI-first), and make empty states feel clearer and friendlier — without new illustration assets or inventing features. Keep BukuHR green.

## Decisions

| Decision | Choice |
|----------|--------|
| Empty “illustration” | Larger branded icon + friendlier copy + one CTA (no SVG scenes / external art) |
| Homes in scope | HR + employee layout; other portals inherit `EmptyState` only |
| Empty primitive | Extend existing `@hrms/ui` `EmptyState` (same props) |

## 1. EmptyState upgrade

**File:** `packages/ui/src/empty-state.tsx`

**Keep API:** `title`, `description?`, `action?`, `icon?`, `variant?: "card" | "flat"`

**Visual changes:**
- Icon sits in a soft green-tinted well (accent soft surface), larger than today’s muted inline icon
- Title: readable body/semibold (not tiny 13px-only feel); description: short secondary text with comfortable max-width
- When `action` is set, it remains the single primary CTA under the copy
- `card` vs `flat` variants preserved; card keeps border/surface/shadow language

**No new props required** for this wave. Call sites that lack an icon should pass an existing `PortalIcon` / product icon where it clarifies the module.

### High-traffic copy / CTA pass

| Surface | File (approx.) | Intent |
|---------|----------------|--------|
| Payroll empty | `apps/web/src/app/(hr)/hr/payroll/page.tsx` | Keep Create payrun CTA; warmer title/description; add payroll icon |
| Notifications empty | `apps/web/src/components/notifications/notifications-list.tsx` | Friendlier “all caught up” / empty inbox copy; keep Bell icon |
| Recruitment hub empty | `apps/web/src/components/hr/recruitment/requisition-hub.tsx` | Invite to create first requisition + CTA if create exists |
| Documents (employee) | `apps/web/src/components/employee/employee-documents-view.tsx` | Clear “nothing to review” copy + icon |
| Documents (branch-admin) | `apps/web/src/app/(branch-admin)/branch-admin/documents/page.tsx` | Same tone; add icon |
| HR action queue clear | `apps/web/src/components/hr/dashboard/hr-action-queue.tsx` | Positive “queue is clear” — not a dead blank |
| Manager dashboard queue | `apps/web/src/app/(manager)/manager/dashboard/page.tsx` | Same positive clear-queue tone |

Copy rules: short, conversational, one next step. No purple. No invented product features (no recognition feed).

## 2. Task-first homes

### HR dashboard — `apps/web/src/app/(hr)/hr/dashboard/page.tsx`

**Current order:** Hero → 4 StatCards → Action queue + right rail  

**New order:**
1. `HrDashboardHero` (unchanged)
2. Action queue + right rail (`HrActionQueue`, `HrWorkforcePulse`, `HrComplianceWatch`, announcements)
3. 4 KPI `StatCard`s (secondary)

No new data queries. Spacing stays `space-y-3` / existing grid classes unless a small gap tweak is needed after reorder.

### Employee dashboard — `apps/web/src/app/(employee)/employee/dashboard/page.tsx`

Already leads with greeting + clock/leave. **Tighten only:**
- Keep greeting / clock / leave band first
- Keep StatCards below that band
- Prefer activity / “what’s next” over competing density; no new modules

### Other portals

Owner, manager, branch-admin, platform: **no home layout rewrite** this phase. They pick up the shared `EmptyState` look wherever they already use it.

## 3. Out of scope

- Illustration image assets / Lottie
- Recognition / shout-out product
- Phase C list template / workspace strip migrations
- Full redesign of owner/manager/branch/platform homes
- Changing Phase A header ownership rules

## Success criteria

1. `EmptyState` shows a larger soft-green icon well, clearer type hierarchy, and room for one CTA
2. Listed high-traffic empties use friendlier copy and an icon (and CTA where an action already exists)
3. HR dashboard shows work queue before KPI strip
4. Employee home still leads with human/task band; KPIs remain secondary
5. Unit/UI smoke: no regressions to empty `action` rendering; green tokens only
