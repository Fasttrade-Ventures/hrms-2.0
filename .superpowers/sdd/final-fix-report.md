# Final fix report — PCB manual override

**Date:** 6 Nov 2026  
**Branch:** `feat/pcb-manual-override`

## Important findings fixed

- **I-1 Net rounding:** Removed the manual-PCB delta path. Auto and manual PCB now use the same existing net formula and round once after deducting the resolved PCB. Updated the manual and zero-amount domain assertions.
- **I-2 Blank amount → sticky 0:** Both PCB actions now reject empty, whitespace, and non-finite manual amounts with a clear error. The persistence helper also rejects all non-finite numbers. Added six action-level validation cases.
- **I-5 Accidental sticky Save:** Draft PCB editing now requires an explicit `Auto (calculated)` or `Use manual amount` mode. Existing sticky overrides open in manual mode with their saved amount; employees without an override open in auto mode. Saving auto clears via `clear=1`, so saving an unchanged auto-calculated line cannot create a sticky override.

## Verification

- Payroll/domain suite: **15 files, 63 tests passed**
- Override persistence tests: **9 passed**
- PCB action validation tests: **6 passed**
- `@hrms/domain` typecheck: passed
- `@hrms/web` typecheck: passed
- IDE lint diagnostics for touched files: none
- `git diff --check`: passed

## Commits

- `083986e` — `fix(payroll): round net with resolved PCB`
- `d2b2efb` — `fix(payroll): require explicit manual PCB mode`

## Deferred

- **I-3 RLS:** Pre-existing database policy gap; deferred for payroll-table policy hardening.
- **I-4 Statutory rules on edit:** Pre-existing `editPayrunLine` rule-pack gap; deferred.
- **I-6 Multi-payrun-type double apply:** Requires a product decision on payrun type/frequency semantics; deferred as a product follow-up.
