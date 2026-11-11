# Requisition detail hiring desk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/hr/recruitment/[requisitionId]` into a hiring desk: sticky job command strip (meta + lifecycle + Add), Sheet add-candidate, richer cards, and `@dnd-kit` drag-and-drop stage moves.

**Architecture:** Server page loads `getRequisition` (strip meta/counts) + `getRequisitionPipeline` (board). Client strip owns Edit dialog + status forms via existing actions. Board becomes a DnD surface that calls `moveStageAction` with the same rules as Advance/Reject, gated by a new `canDropOnBoardStage` helper that blocks `hired`. Add-candidate moves into a Sheet.

**Tech Stack:** Next.js App Router, existing portal UI + Dialog, new shadcn Sheet, `@dnd-kit/core` + `@dnd-kit/utilities`, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-11-requisition-detail-hiring-desk-design.md`](../specs/2026-11-11-requisition-detail-hiring-desk-design.md)

## Global Constraints

- Do not push, merge, or commit unless the user explicitly asks.
- Do not allow UI drops onto `hired` — hire remains Accept offer only.
- Reuse `moveStageAction`, `updateRequisitionAction`, `setRequisitionStatusAction`, add-candidate action — no new product rules.
- Stay on portal tokens; no new brand system.
- Fixed Phase 6 stages only; no custom stages / bulk move / scheduling.
- Preserve candidate detail route and draft-hire link behavior.

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/recruitment/types.ts` | Add `canDropOnBoardStage` |
| `tests/recruitment/types.test.ts` | Cover board drop allow/deny (esp. `hired`) |
| `apps/web/src/lib/recruitment/applications.ts` | Include `source` on pipeline candidate select |
| `apps/web/package.json` | Add `@dnd-kit/core`, `@dnd-kit/utilities` |
| `apps/web/src/components/ui/sheet.tsx` | Sheet primitive (missing today; Dialog already exists) |
| `apps/web/src/components/hr/recruitment/requisition-command-strip.tsx` | Sticky strip: meta, lifecycle, Edit, Add trigger |
| `apps/web/src/components/hr/recruitment/add-candidate-panel.tsx` | Sheet-based add (replace always-visible inline form) |
| `apps/web/src/components/hr/recruitment/recruitment-pipeline.tsx` | DnD board + richer cards |
| `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/page.tsx` | Compose strip + board; load `getRequisition` |
| `docs/features.md` | One-line: hiring-desk board polish |

---

### Task 1: Board drop helper + tests

**Files:**
- Modify: `apps/web/src/lib/recruitment/types.ts`
- Modify: `tests/recruitment/types.test.ts`

**Interfaces:**
- Produces: `canDropOnBoardStage(from: RecruitmentStage, to: RecruitmentStage): boolean`
- Rule: `false` when `to === "hired"`; otherwise `canMoveToStage(from, to)`.

**Steps:**

- [ ] **Step 1: Write failing tests** in `tests/recruitment/types.test.ts`:

```ts
import { canDropOnBoardStage } from "@/lib/recruitment/types";

it("allows forward drops and reject/withdrawn", () => {
  expect(canDropOnBoardStage("applied", "interview")).toBe(true);
  expect(canDropOnBoardStage("screening", "rejected")).toBe(true);
  expect(canDropOnBoardStage("offer", "withdrawn")).toBe(true);
});

it("blocks drop onto hired and backward moves", () => {
  expect(canDropOnBoardStage("offer", "hired")).toBe(false);
  expect(canDropOnBoardStage("interview", "applied")).toBe(false);
  expect(canDropOnBoardStage("hired", "offer")).toBe(false);
});
```

- [ ] **Step 2: Run** `pnpm exec vitest run tests/recruitment/types.test.ts` — expect FAIL (`canDropOnBoardStage` missing)

- [ ] **Step 3: Implement** in `types.ts`:

```ts
export function canDropOnBoardStage(from: RecruitmentStage, to: RecruitmentStage): boolean {
  if (to === "hired") return false;
  return canMoveToStage(from, to);
}
```

- [ ] **Step 4: Re-run tests** — expect PASS

- [ ] **Step 5: Commit only if user asked**

---

### Task 2: Pipeline data for strip + cards

**Files:**
- Modify: `apps/web/src/lib/recruitment/applications.ts` (`getRequisitionPipeline`)
- Modify: `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/page.tsx` (load detail; pass props — full UI in later tasks)

**Interfaces:**
- Consumes: `getRequisition(id)` → `RequisitionDetail` (already has `hiredCount`, `headcount`, `departmentName`, `branchName`, `employmentType`, `status`, `description`, …)
- Produces: pipeline `job_candidates` includes `source` for card secondary line

**Steps:**

- [ ] **Step 1: Extend pipeline select** — change candidates embed from  
  `job_candidates(full_name, email, phone)` →  
  `job_candidates(full_name, email, phone, source)`

- [ ] **Step 2: Update page loader** to fetch both:

```ts
import { getRequisition } from "@/lib/recruitment/requisitions";
import { getRequisitionPipeline } from "@/lib/recruitment/applications";

const [detail, pipeline] = await Promise.all([
  getRequisition(requisitionId),
  getRequisitionPipeline(requisitionId),
]);
if (!detail || !pipeline) notFound();
```

- [ ] **Step 3: Keep existing page render working** for now (pass `detail` unused is OK until Task 3; prefer pass into a temporary prop or leave const for next task). Typecheck must still pass — either use `detail` in header meta immediately or void with a comment-free usage in the next task in the same PR batch.

- [ ] **Step 4: Run** `pnpm --filter @hrms/web typecheck` — expect exit 0

- [ ] **Step 5: Commit only if user asked**

---

### Task 3: Command strip (lifecycle + edit)

**Files:**
- Create: `apps/web/src/components/hr/recruitment/requisition-command-strip.tsx`
- Modify: `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/page.tsx`
- Reuse patterns from: `apps/web/src/components/hr/recruitment/requisition-hub.tsx` (`RequisitionStatusActions`, `EditRequisitionDialog`, `formatMeta`)

**Interfaces:**
- Consumes: `RequisitionDetail`; `setRequisitionStatusAction`; `updateRequisitionAction`; branch/department option lists for edit form
- Produces: `<RequisitionCommandStrip detail={…} branches={…} departments={…} onAddCandidate={() => void} addDisabled={boolean} />`
- Sticky strip under portal header: title, status badge, meta (`employmentType · department · branch · hiredCount/headcount · openPipelineCount`), description clamp, actions: Add · Edit · Hold/Resume/Close/Re-open

**Steps:**

- [ ] **Step 1: Load select options on the page** the same way the hub does (org branches/departments helpers already used by recruitment page — mirror hub imports).

- [ ] **Step 2: Implement `RequisitionCommandStrip`** as a client component:
  - Status badge (success / warning / outline) matching hub
  - Meta line from `detail`
  - Description: `line-clamp-1` + toggle “More” / “Less” if long
  - Primary `Button` “Add candidate” when `!addDisabled`; otherwise omit/disable
  - “Edit” opens Dialog (copy structure from hub `EditRequisitionDialog` using `detail` fields; closed = read-only)
  - Status forms: same transitions as hub (`open` → Hold/Close; `on_hold` → Resume/Close; `closed` → Re-open) via `setRequisitionStatusAction`
  - When `on_hold` / `closed`, apply muted/banner tone on the strip container (`border` + `bg-muted/40` or `HrBanner`-adjacent styling)

- [ ] **Step 3: Replace `PortalPageHeader` block** on the detail page with back link + `RequisitionCommandStrip`. Keep a simple back `Link` above the strip.

- [ ] **Step 4: Manual smoke** — open requisition, Hold → board should still exist (read-only comes from status); Re-open; Edit title saves.

- [ ] **Step 5: Commit only if user asked**

---

### Task 4: Sheet primitive + Add candidate Sheet

**Files:**
- Create: `apps/web/src/components/ui/sheet.tsx` (shadcn/base-ui Sheet aligned with existing `dialog.tsx` patterns)
- Modify: `apps/web/src/components/hr/recruitment/add-candidate-panel.tsx`
- Modify: page + command strip wiring (`onAddCandidate` / controlled open)

**Interfaces:**
- Produces: controlled `AddCandidatePanel` with `{ requisitionId, open, onOpenChange }` (remove always-visible inline “Candidates” section)
- Empty board CTA and strip “Add candidate” both set `open=true`
- When `applicationCount === 0` and status `open`, initial `open` defaults to `true` once

**Steps:**

- [ ] **Step 1: Add Sheet UI** — implement `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` compatible with the project’s `@base-ui/react` / shadcn style (match `dialog.tsx` imports and `cn` usage). Side: `right`, width ~`sm:max-w-md`.

- [ ] **Step 2: Rewrite `AddCandidatePanel`** to render only inside Sheet:

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Add candidate</SheetTitle>
      <SheetDescription>Add people to this requisition, then move them on the board.</SheetDescription>
    </SheetHeader>
    <AddCandidateForm requisitionId={requisitionId} />
  </SheetContent>
</Sheet>
```

- [ ] **Step 3: Lift open state** to a small client wrapper on the page (e.g. `RequisitionDesk`) that owns `addOpen` and passes setters to strip + empty CTA + panel — **or** keep strip/panel siblings with a thin `RequisitionDeskClient` shell. Prefer one client shell to avoid prop drilling via server page.

Suggested shell:

```tsx
// requisition-desk.tsx ("use client")
export function RequisitionDesk({ detail, applications, branches, departments, requisitionId }: Props) {
  const [addOpen, setAddOpen] = useState(detail.status === "open" && applications.length === 0);
  const readOnly = detail.status === "on_hold" || detail.status === "closed";
  return (
    <>
      <RequisitionCommandStrip … onAddCandidate={() => setAddOpen(true)} addDisabled={readOnly} />
      <AddCandidatePanel open={addOpen} onOpenChange={setAddOpen} requisitionId={requisitionId} />
      <RecruitmentPipeline … onRequestAdd={() => setAddOpen(true)} />
    </>
  );
}
```

- [ ] **Step 4: Typecheck** `pnpm --filter @hrms/web typecheck`

- [ ] **Step 5: Commit only if user asked**

---

### Task 5: DnD board + richer cards

**Files:**
- Modify: `apps/web/package.json` (deps)
- Modify: `apps/web/src/components/hr/recruitment/recruitment-pipeline.tsx`

**Interfaces:**
- Consumes: `canDropOnBoardStage`, `moveStageAction`, `RECRUITMENT_STAGES`, applications with `source`
- Produces: drag card → drop column; invalid drop snaps back + error message; no drop highlight on `hired` column as a target (column still visible for hired cards)
- Card shows: name, email **or** source, days-in-stage, offer chip, Advance/Reject, draft-hire link
- Empty board (`applications.length === 0` && !readOnly): centered CTA calling `onRequestAdd`
- Quiet per-column empty placeholder; while dragging over a **valid** column show “Drop here”

**Steps:**

- [ ] **Step 1: Install**  
  `pnpm --filter @hrms/web add @dnd-kit/core @dnd-kit/utilities`

- [ ] **Step 2: Rewrite pipeline as DnD** (outline):

```tsx
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import { canDropOnBoardStage, type RecruitmentStage } from "@/lib/recruitment/types";

// Each column: useDroppable({ id: stage })
// Each card: useDraggable({ id: application.id, data: { stage } }) — disabled when readOnly || TERMINAL_STAGES.includes(stage)

async function handleDragEnd(event: DragEndEvent) {
  const toStage = event.over?.id as RecruitmentStage | undefined;
  const fromStage = event.active.data.current?.stage as RecruitmentStage;
  const applicationId = String(event.active.id);
  if (!toStage || toStage === fromStage) return;
  if (!canDropOnBoardStage(fromStage, toStage)) {
    setBoardError("That stage move is not allowed.");
    return;
  }
  // Call moveStageAction via form Action or startTransition + server action wrapper
  // Include requisitionId for revalidate paths
}
```

Prefer invoking the existing server action with a `FormData` (or extract a small `moveApplicationStageClient(applicationId, requisitionId, toStage)` helper that builds FormData and calls `moveStageAction`) so revalidation stays identical.

- [ ] **Step 3: Card chrome** — widen columns slightly (`w-[260px]`), clearer header, secondary line `source ?? email`, keep Advance/Reject forms for non-terminal when `!readOnly`.

- [ ] **Step 4: Hired column** — still lists hired cards; not a droppable target (`useDroppable` skipped or `disabled: true` when stage === `"hired"`).

- [ ] **Step 5: Manual smoke**
  - Drag applied → screening (ok)
  - Drag screening → applied (blocked + message)
  - Drag to hired (blocked)
  - Drag to rejected (ok)
  - Hold requisition: dragging disabled; Advance/Reject hidden

- [ ] **Step 6: Commit only if user asked**

---

### Task 6: Docs + success checklist

**Files:**
- Modify: `docs/features.md` (Recruitment row for pipeline)
- Verify: typecheck + recruitment unit tests

**Steps:**

- [ ] **Step 1: Update features.md** pipeline note, e.g.  
  `Hiring-desk board at /hr/recruitment/[id] — command strip, Sheet add, DnD stages (no drag-to-hired)`

- [ ] **Step 2: Run**  
  `pnpm exec vitest run tests/recruitment/types.test.ts`  
  `pnpm --filter @hrms/web typecheck`  
  Expect PASS / exit 0

- [ ] **Step 3: Walk success criteria from the spec** (checklist in §7) manually in the browser

- [ ] **Step 4: Commit only if user asked**

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Sticky command strip + meta + lifecycle | 3 |
| Sheet add-candidate + empty CTA | 4 |
| Richer cards | 5 |
| DnD + allow/deny incl. no `hired` | 1 + 5 |
| Enrich data (dept/branch/headcount/source) | 2 |
| Read-only hold/closed | 3 + 5 |
| Portal tokens / mobile scroll + button fallbacks | 5 |
| features.md | 6 |
| No hire-by-drag | 1 + 5 |

No TBD/placeholder steps. Types: `canDropOnBoardStage` produced in Task 1, consumed in Task 5; `RequisitionDesk` shell introduced in Task 4 owns Add open state for strip + board CTA.
