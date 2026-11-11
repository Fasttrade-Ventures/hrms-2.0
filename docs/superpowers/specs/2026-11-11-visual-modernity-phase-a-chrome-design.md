# BukuHR Visual Modernity — Phase A Chrome Design

**Status:** Implemented (Approach A, page-owned H1)  
**Parent:** BukuHR visual modernity audit canvas (`bukuhr-visual-modernity-audit.canvas.tsx`)  
**Scope now:** Phase A chrome done. Phase B (homes/empties) and Phase C (list/workspace migrations) come later, over time.

## Goal

One clear page title per signed-in view. Kill the double-title pattern (shell `h1` + in-page header). Keep BukuHR green. Apply across all portals via shared shell/primitives.

## Decisions

| Decision | Choice |
|----------|--------|
| Rollout | Full A → B → C over time; **A first** |
| Portals | All portals (shared `PortalShell`) |
| Title ownership | **Page owns the H1** |
| Approach | Primitives-first, then migrate |

## Chrome rules

1. **Shell top bar** — nav context only: current page label as non-heading text, org switcher, date, bell, account. **No `h1`.**
2. **Breadcrumbs** — stay in main content (existing).
3. **`PortalPageHeader`** — the standard page title: real **`h1`**, optional description, optional actions.
4. **Custom title surfaces** that already act as the page title (HR/employee dashboard heroes, employee directory heading, org hub heading, requisition command strip) must expose exactly one **`h1`** and must not stack a `PortalPageHeader` on top.
5. **Gap pages** that relied only on the shell title (e.g. notifications) get a `PortalPageHeader`.

## Out of scope (later)

- Task-first home redesign (Phase B)
- Illustrated empties (Phase B)
- Shared list template / workspace strip rollout (Phase C)
- Unifying card systems beyond what’s needed for header consistency
- Pencil module mock screens

## Success criteria

- Shell has zero `h1` elements.
- `PortalPageHeader` renders `h1`.
- Unit test “signed-in pages have one h1” matches page-owned model.
- Workspaces with their own strip (recruitment desk) keep a single `h1` in the strip.
