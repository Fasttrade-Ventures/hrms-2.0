# Final fix report — requisition hiring desk

Not committed.

## Changes

1. `recruitment-pipeline.tsx`: `DndContext` now has `id={`requisition-board-${requisitionId}`}` (stable, avoids hydration id mismatch).
2. `requisition-command-strip.tsx`: removed translucent `bg-muted/40`. Strip uses solid `bg-[var(--surface-card)]`. On hold or closed it uses solid `bg-[var(--surface-primary)]` with a dashed border as the muted cue.
3. `requisition-command-strip.tsx`: `onAddCandidate` is now required. The `document.getElementById("add-candidate-panel")?.scrollIntoView` fallback is removed. The button uses `onClick={onAddCandidate}`.
4. `requisition-command-strip.tsx`: sticky is desktop-only (`lg:sticky lg:top-0 lg:z-20`), with a solid background. It is not sticky on mobile.
5. `requisition-command-strip.tsx`: requisition title changed from `h2` to `h1`.

Out of scope, untouched: hub duplication, keyboard coordinateGetter, authenticated browser smoke.

## Verification

`pnpm --filter @hrms/web typecheck` — passed (`tsc --noEmit`, no errors).

`pnpm exec vitest run tests/recruitment/types.test.ts`:
```
 ✓ tests/recruitment/types.test.ts (8 tests) 3ms
 Test Files  1 passed (1)
      Tests  8 passed (8)
```
