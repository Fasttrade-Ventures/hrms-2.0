# Payroll calculator benchmark (Malaysia 2026)

Cross-site QA matrix for statutory accuracy. **HRMS authority** = PERKESO/KWSP/LHDN tables in `packages/domain` + automated tests in `tests/payroll/calculator-benchmark.test.ts`.

## Authority order

1. **Official** — [KWSP](https://www.kwsp.gov.my), [PERKESO](https://www.perkeso.gov.my), [LHDN](https://www.hasil.gov.my)
2. **[Fincrew salary calculator](https://www.fincrew.my/en/salary-calculator.html)** — aligns with HRMS SOCSO Cat 1 at RM 4,000
3. **payroll.my (HR.my)** — useful for full tax profile; verify SOCSO category separately
4. **[malaysiasalarycalculator.com](https://malaysiasalarycalculator.com/)** — good PCB threshold education; SOCSO/EIS amounts often outdated

## Standard inputs (all scenarios)

| Field | Value |
|-------|-------|
| Gross salary | See scenario |
| EPF employee / employer | 11% / 13% |
| Age | Under 55 (Cat 1 SOCSO) |
| EIS | Eligible |
| YTD | 0 (new year) |
| Month | June 2026 |
| HRDF / LINDUNG / Zakat monthly | Off |

## Scenarios

### B-4000-SINGLE

| | EPF EE | SOCSO EE | EIS EE | PCB | Net pay |
|---|--------|----------|--------|-----|---------|
| **HRMS** | 440.00 | 19.75 | 7.90 | 16.70 | **3,515.65** |
| Fincrew | 440.00 | 19.75 | 7.90 | 16.75 | 3,515.60 |
| payroll.my | — | — | — | — | (use married scenario) |
| malaysiasalary | 440.00 | 6.00* | 8.00* | 0.00* | 3,546.00* |

\* Outdated or simplified — not used as pass/fail.

### B-4000-MARRIED-2C (spouse working, 2 children)

| | EPF EE | SOCSO EE | EIS EE | PCB | Net pay |
|---|--------|----------|--------|-----|---------|
| **HRMS** | 440.00 | 19.75 | 7.90 | **0.00** | **3,532.00** |
| payroll.my | 440.00 | 49.40† | 7.90 | 0.00 | 3,502.70 |
| malaysiasalary | 440.00 | — | — | 0.00 | — |

† payroll.my SOCSO EE does not match PERKESO Cat 1 (RM 19.75). Treat as site-specific until verified.

**Why PCB = 0:** Income after EPF = RM 3,560 &lt; married PCB threshold RM 3,851 ([malaysiasalary explanation](https://malaysiasalarycalculator.com/)).

### B-5000-SINGLE

| | EPF EE | SOCSO EE | EIS EE | PCB (approx) | Net pay |
|---|--------|----------|--------|--------------|---------|
| **HRMS** | 550.00 | 24.75 | 9.90 | ~97 | ~4,335 |
| malaysiasalary (worked example) | 550.00 | 7.50 | 10.00 | 97.00 | 4,335.50 |

## Manual QA checklist (Phase 3)

For each scenario, on each external site:

- [ ] Record exact inputs (marital, children, residency, SOCSO category)
- [ ] Screenshot EPF / SOCSO / EIS / PCB / net
- [ ] Note pay period month if site asks
- [ ] Log variance vs HRMS in `calculator-benchmarks.json` → `external` notes

## Automated verification

```bash
pnpm test tests/payroll/calculator-benchmark.test.ts
pnpm test tests/migration/payroll-golden.test.ts
pnpm test packages/domain/src/payroll/pcb-mtd.test.ts
```

## HRMS regression policy

- **Pass:** HRMS matches official tables (EPF/SOCSO/EIS exact; PCB ±RM 0.05).
- **Document only:** Variance vs third-party calculators when inputs or tables differ.
- **Fail:** HRMS deviates from PERKESO/KWSP published bands without documented reason.

_Last updated: Jul 2026_
