# Requisition detail hiring desk — design

**Date:** 11 Nov 2026  
**Status:** Approved (brainstorm)  
**Surface:** `/hr/recruitment/[requisitionId]`  
**Related:** [Recruitment enterprise desk](./2026-11-11-recruitment-enterprise-desk-design.md)

---

## 1. Summary

Upgrade the requisition pipeline page from a thin title + form + generic kanban into a single **hiring desk**: sticky job command strip (context + lifecycle + Add), Sheet-based add-candidate, richer cards, and **drag-and-drop** stage moves via `@dnd-kit`, reusing existing recruitment actions and stage rules.

| Decision | Choice |
|----------|--------|
| Scope | Full polish: layout, board, context + lifecycle on this page |
| Interaction | Visual + Sheet add-candidate + DnD board |
| Lifecycle | Edit + Hold / Close / Re-open on the command strip (same rules as hub) |
| Approach | Hiring desk surface (Approach 1) |

---

## 2. Goals and non-goals

### Goals

1. One glance: job status, headcount progress, meta, and primary actions without returning to the hub.
2. Board is the visual hero; Add candidate does not permanently crowd the page.
3. Drag cards between allowed stages; Advance / Reject remain as fallbacks (esp. mobile).
4. Empty open requisition has a clear “add first candidate” moment.
5. Stay inside portal design tokens — density and hierarchy, not a new brand system.

### Non-goals

- Custom stages, interview scheduling, scorecards
- Bulk select / multi-card move
- Public careers / candidate self-apply
- Changing offer or accept-hire rules
- Dragging into **`hired`** (hire remains Accept offer only — enterprise desk §5)

---

## 3. Page composition

Route unchanged: `/hr/recruitment/[requisitionId]`.

Vertical stack:

1. **Back / breadcrumb** — link to `/hr/recruitment` (light; not a second page title).
2. **Job command strip** (sticky under portal chrome on desktop)
   - **Left:** title · status badge · meta line (employment type · department · branch · headcount `hired/target` · pipeline candidate count)
   - **Right:** **Add candidate** (primary, when `open`) · **Edit** · lifecycle (**Hold** / **Close** / **Re-open** matching hub)
   - Description: one-line clamp with expand; not a large block under the title
3. **Board** — full-width horizontal kanban (page hero). No separate permanent “Candidates” section above the board.
4. **Add candidate** — opens a **Sheet** with the existing add form. When `applicationCount === 0` and status is `open`, auto-open Sheet once on first visit and show an empty-board CTA that opens the same Sheet.
5. **Read-only modes** (`on_hold` / `closed`): strip uses banner tone; DnD off; Add disabled; lifecycle actions still available per hub rules.

---

## 4. Board, cards, and DnD

### Columns

- Keep fixed Phase 6 stages: `applied` → `screening` → `interview` → `assessment` → `offer` → `hired` | `rejected` | `withdrawn`.
- Stronger column chrome: stage label + count; taller usable height; quieter empty state (subtle placeholder; “Drop here” only while dragging).

### Cards

- Primary: candidate name  
- Secondary: email or source  
- Meta: days-in-stage  
- Offer status chip when an offer exists  
- Click → existing candidate detail route  
- Compact **Advance** / **Reject** fallbacks  
- If `employee_id` set → small “Draft hire” link (unchanged behavior)

### Drag-and-drop

- Library: `@dnd-kit` (PointerSensor + KeyboardSensor).
- Drop onto a stage column → same server path as today (`moveStageAction` / `moveApplicationStage`).
- **Allowed drops:** forward non-terminal stages per `canMoveToStage`; terminal **`rejected`** and **`withdrawn`**.
- **Disallowed:** backward moves; leaving a terminal stage; drop onto **`hired`** (UI must not offer hire-by-drag). Invalid drop → snap back + short error.
- Default persistence: await server action then refresh (optimistic UI optional, not required).
- Board DnD disabled when requisition is `on_hold` or `closed`.

### Empty board

When zero applications and status `open`: centered empty panel near the board with short copy + **Add first candidate** (opens Sheet). Do not keep an always-visible inline form above the columns.

---

## 5. Lifecycle and edit wiring

Reuse existing server actions — no new product rules:

| UI control | Action |
|------------|--------|
| Edit | Existing update flow (`updateRequisitionAction`) in a Sheet/dialog with current fields; closed requisitions read-only except Re-open |
| Hold / Close / Re-open | `setRequisitionStatusAction` with same transitions as hub |
| Add candidate | Existing add-candidate form + action inside Sheet |
| Stage move | `moveStageAction` |

### Data for the strip

Enrich pipeline page load (or parallel fetch) so the strip can show:

- employment type, department name, branch name  
- `hiredCount` / `headcount`  
- application (pipeline) count  

Prefer extending `getRequisitionPipeline` or composing with existing requisition list helpers already used by the hub.

---

## 6. Visual language and mobile

- Use portal tokens (`--surface-*`, badges, buttons, borders). No purple/glow/new marketing aesthetic.
- Sticky strip may collapse meta to one truncated line on small viewports.
- Board remains horizontally scrollable.
- DnD when pointer allows; Advance / Reject always available on cards.

---

## 7. Success criteria

- [ ] Open requisition reads as a hiring desk in one viewport (strip + board).
- [ ] Add candidate is Sheet-based; zero-candidate empty state is clear.
- [ ] Drag moves stages correctly; invalid drops (incl. `hired` / backward) rejected.
- [ ] Edit / Hold / Close / Re-open work without returning to the hub.
- [ ] Hold/closed: board read-only, Add disabled, banner tone on strip.
- [ ] Candidate click and draft-hire link still work.

---

## 8. Implementation notes (for plan)

Likely touch points:

- `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/page.tsx`
- `apps/web/src/components/hr/recruitment/recruitment-pipeline.tsx` (board + DnD)
- `apps/web/src/components/hr/recruitment/add-candidate-panel.tsx` → Sheet
- New: command-strip / edit-sheet components under `components/hr/recruitment/`
- `apps/web/package.json` — add `@dnd-kit/core` (+ sensors helpers as needed)
- Pipeline data helpers under `lib/recruitment/`

Tests: stage-move rules already covered where present; add focused unit/UI tests for drop allow/deny if cheap; manual smoke for DnD + lifecycle strip.
