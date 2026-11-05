# PCB Manual Override — Design Spec

**Date:** 6 Nov 2026  
**Status:** Approved — 6 Nov 2026  
**Scope:** Professional+ payroll — allow HR to override auto PCB while keeping default auto-calculation  
**Related:** [payroll-module-design.md](./2026-07-27-payroll-module-design.md) §6.6 · [features.md](../../features.md) §8 · `packages/domain/src/payroll/pcb-mtd.ts`

---

## 1. Summary

By default, BukuHR continues to **auto-calculate PCB** with the existing LHDN computerised MTD path (`pcbMtdFull`).

HR may optionally set a **manual PCB amount** for an employee. While that override is active:

- Every new draft payrun uses the manual amount instead of auto PCB.
- Payslips, payrun grids, exports, and EA still show a single line labeled **PCB** (never “voluntary PCB”).
- Gross / salary / profit earnings are unchanged by the override; **net take-home** recalculates from the overridden PCB.
- Editing PCB on a **draft payrun** updates the employee’s sticky override so **later months** keep the same amount until cleared.

Clearing the override returns the employee to auto PCB on the next generate/recalc.

---

## 2. Product decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Default behaviour | Auto PCB via `pcbMtdFull` when no override is set |
| 2 | Override type | Fixed **total** PCB amount for the period (replaces auto result) |
| 3 | Duration | Sticky on the employee until HR clears it (“every month”) |
| 4 | Draft payrun edit | Editing PCB on a draft **also writes** the sticky employee override (applies to other/future months) |
| 5 | Display | Always label **PCB** — no voluntary / additional / override wording on payslip or employee-facing UI |
| 6 | Net pay | Override changes PCB + net only; gross and other statutory bases stay as calculated from earnings |
| 7 | Salary / profit change | Earnings update as today; while override is active, PCB stays at the manual amount |
| 8 | YTD / statutory | Overridden PCB still accumulates into `ytd_pcb` and statutory PCB exports as normal PCB |
| 9 | Who can set | Same as draft payroll edit: HR administrator / payroll processor |
| 10 | Locked / approved payruns | Immutable; override only affects draft generate/recalc and future drafts |
| 11 | Employee self-service | Employees cannot set PCB override (HR-only) |
| 12 | Naming in schema | Internal fields may use `pcb_manual_*`; UI copy must say PCB / “Use manual amount” / “Clear — use auto” |

---

## 3. Goals

1. Keep Malaysia auto MTD as the safe default.
2. Let HR force a specific PCB amount when needed (e.g. extra withholding), without a separate “voluntary” product concept.
3. Make one edit on a draft stick for subsequent months until cleared.
4. Keep payslip and export UX identical: one PCB figure.

## 4. Non-goals

- Separate “voluntary PCB” component or payslip line.
- Per-period-only override that does not update the employee sticky value (rejected).
- Auto “extra on top of MTD” mode (fixed total only for v1).
- Multi-level tax authority CP38 schedules as a first-class import (may map manually via override).
- Changing gross/basic when PCB is overridden.
- Employee-facing declaration of PCB override.

---

## 5. Current behaviour (baseline)

- PCB is computed in `packages/domain` via `pcbMtdFull` and wired through `computeEmployeePayrun` / `payrun-pipeline.ts`.
- Draft line edits (`editPayrunLine`) rebuild non-statutory lines, then **recompute and overwrite** all statutory components including `DED_PCB`.
- There is no persisted PCB override field today (unlike voluntary EPF on `employee_compensation`).
- Payrun UI shows PCB as a read-only total column; payslip PDF labels it `PCB (Tax)`.

---

## 6. Data model

Add to `public.employee_tax_profiles`:

| Column | Type | Notes |
|--------|------|--------|
| `pcb_manual_amount` | `numeric(14,2)` nullable | When not null, treat as active override amount (≥ 0) |
| `pcb_manual_updated_at` | `timestamptz` nullable | Last time override was set/cleared |
| `pcb_manual_updated_by` | `uuid` nullable → `auth.users` | Audit who last changed it |

**Active override rule:** `pcb_manual_amount IS NOT NULL`.

**Clear override:** set `pcb_manual_amount` (and optionally audit columns) to null.

Optional later (not v1): `payroll_payrun_items.pcb_source` (`auto` \| `manual`) for audit display only. v1 can infer source from whether the employee profile had an override at compute time and/or store a boolean `pcb_manual_applied` on the item if cheap.

Migration: new Supabase migration under `supabase/migrations/`.

---

## 7. Domain / pipeline

### 7.1 Compute input

Extend payrun compute input (tax profile mapping) with:

- `pcbManualAmount: Decimal | null`

### 7.2 Resolution

After normal earnings → wage bases → statutory pipeline would compute auto PCB:

```
pcb = pcbManualAmount != null ? pcbManualAmount : pcbMtdFull(...)
```

Still:

- Floor at 0 if needed (reject negative override in validation).
- Write `payroll_payrun_items.pcb` and `DED_PCB` as today.
- Do **not** change EPF/SOCSO/EIS because of PCB override.
- Net = existing net formula using the resolved PCB.

### 7.3 Recalc after other line edits

When HR edits an earning/deduction line and the pipeline recalculates statutory amounts:

- If sticky override is active → PCB remains the manual amount (do not overwrite with auto).
- If no override → PCB follows auto as today.

### 7.4 Draft PCB edit path

New or extended edit API (preferred: dedicated `overridePayrunPcb` / allow `DED_PCB` with special handling):

1. Validate draft status, amount ≥ 0, permissions.
2. Upsert `employee_tax_profiles.pcb_manual_amount` = amount (sticky for other months).
3. Recompute item with override applied; persist `pcb`, `DED_PCB`, `net_pay`.
4. Do not label UI as voluntary.

**Clear from draft/profile:** set amount null → recalc with auto PCB.

---

## 8. UI / UX

### 8.1 Employee payroll / tax profile (HR)

- Field: **PCB** with mode toggle or clear control:
  - Default: “Auto (calculated each payrun)”
  - Manual: amount input (RM)
  - Action: “Clear — use auto”
- Helper text (HR only): “Manual amount applies to this and future payruns until cleared. Payslips still show PCB.”
- Never show the word “voluntary” in product copy.

### 8.2 Draft payrun

- Make PCB editable on the employee payrun detail / line editor (same permissions as other draft edits).
- Saving PCB amount:
  - Updates this draft item’s PCB + net immediately.
  - Persists sticky override on the employee for **other months**.
- Visual cue for HR only (optional): subtle “Manual” badge next to PCB on the draft row — **not** shown on employee payslip.

### 8.3 Employee payslip / portal / PDF / bank & statutory exports

- Unchanged labels: **PCB** / `PCB (Tax)`.
- Single amount = resolved PCB (auto or manual).

---

## 9. Validation & edge cases

| Case | Behaviour |
|------|-----------|
| Manual amount null | Auto PCB |
| Manual amount 0 | Allowed; PCB = 0; net increases accordingly |
| Negative amount | Reject |
| Override + salary raise | Gross changes; PCB stays manual until cleared |
| Override cleared mid-year | Next draft uses auto; YTD already locked months unchanged |
| Approved/locked payrun | Cannot edit PCB |
| Missing tax profile row | Create/upsert profile when setting override |
| Rounding | Store and display to 2 decimals (sen); do not force 5-sen ceil on manual amount |

---

## 10. Audit & compliance notes

- Sticky override is an employer/HR choice of PCB amount for payroll processing.
- Still reported as PCB in exports and YTD.
- Prefer recording `pcb_manual_updated_by` / `updated_at` on the tax profile.
- Domain tests must cover: auto path unchanged when null; manual replaces auto; earning edit preserves manual; clear restores auto; net moves with PCB.

---

## 11. Testing plan (acceptance)

1. Employee with no override → generate draft → PCB matches current golden/`pcbMtdFull` behaviour.
2. Set manual PCB on profile → generate → item PCB equals manual; payslip shows “PCB” only.
3. Change basic salary while override active → gross changes, PCB stays manual, net updates.
4. Edit PCB on draft → profile sticky amount updates; generate next month → same PCB.
5. Clear override → recalc/generate → auto PCB returns.
6. Lock payrun → `ytd_pcb` includes overridden amount.
7. Statutory PCB export / EA includes the amount under PCB (no new column).

---

## 12. Implementation sketch (for later plan)

1. Migration on `employee_tax_profiles`.
2. Domain: pass `pcbManualAmount` through compute; unit tests.
3. `build-compute-input` / generate / edit pipelines honour override.
4. Dedicated draft PCB override action that upserts sticky amount + recalc net.
5. HR UI: profile control + draft PCB edit.
6. Docs: `features.md` / payroll accuracy notes — “PCB manual override (sticky)”.

---

## 13. Open items (none blocking)

- Optional draft-only “Manual” badge for HR (nice-to-have).
- Optional `pcb_manual_applied` on payrun item for historical audit if product wants it later.

---

## 14. Spec self-review

- No placeholders for unresolved product choices (sticky + draft writes sticky + default auto + display as PCB + net-only side effect).
- Consistent with existing payroll architecture (domain compute + draft immutability rules).
- Scope limited to PCB override; no voluntary branding; no gross mutation.
