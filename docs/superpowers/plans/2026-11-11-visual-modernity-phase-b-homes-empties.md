# Visual Modernity Phase B — Homes & Empties Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Friendlier shared `EmptyState` + task-first HR home (queue before KPIs); light employee home tighten; high-traffic empty copy/icon/CTA pass.

**Architecture:** Upgrade `@hrms/ui` EmptyState visuals once; reorder HR dashboard JSX; update listed call sites only. No new features or illustration assets.

**Tech Stack:** React, Tailwind CSS variables (Forest Sage / BukuHR green), Next.js App Router.

## Global Constraints

- Keep BukuHR green — no purple wash.
- EmptyState API unchanged: `title`, `description?`, `action?`, `icon?`, `variant?`.
- No recognition/shout-out feature.
- Other portal homes: EmptyState only, no layout rewrite.

---

### Task 1: Upgrade EmptyState visual

**Files:**
- Modify: `packages/ui/src/empty-state.tsx`

- [x] **Step 1: Restyle EmptyState**

Replace the icon + typography block so that:
- Icon wraps in a soft well: `mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]` (icon children inherit color)
- Title uses `text-sm font-semibold text-[var(--foreground-primary)]` (or `text-base` if still readable)
- Description uses `mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]` (not 11px)
- Action keeps `mt-4`
- Card variant: slightly more padding (`py-10`), keep border/card/shadow
- Flat variant: same icon well + type, no card chrome

- [x] **Step 2: Smoke** — unit tests pass; empties updated in code

---

### Task 2: Reorder HR dashboard + tighten employee home

- [x] **Step 1: HR — move queue grid above StatCards**
- [x] **Step 2: Employee — already task-first; no layout change needed**

---

### Task 3: High-traffic empty copy / icon / CTA

- [x] **Step 1: Apply copy/icon updates at each call site**
- [x] **Step 2: Verify** — `high-severity-fixes` tests pass

---

### Task 4: Verify

- [x] Confirm HR dashboard order in code
- [x] Confirm EmptyState has accent icon well
- [x] Confirm listed empties have icons
