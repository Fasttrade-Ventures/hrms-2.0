# Payroll accuracy matrix (Malaysia)

Cross-check of statutory calculations against official sources and golden test cases.

| ID | Scenario | Gross / inputs | Expected (RM) | Source | Golden test | Notes |
|----|----------|----------------|---------------|--------|-------------|-------|
| EPF-01 | EPF ceiling round RM50 | 6,955 | EE 765.05, ER 904.15 | KWSP Third Schedule | `epf-ceil-rm50-6955` | Contributable wage rounds up to 7,000 |
| EPF-02 | Standard 11% / 13% on 5,000 | 5,000 | EE 550, ER 650 | KWSP rate table | `epf-standard-5000` | Monthly salaried |
| SOCSO-01 | Cat 1 wage ceiling 6,000 | 7,000 | Band at 6,000 | PERKESO rate table | `socso-ceiling-6000` | Wage capped for contribution |
| EIS-01 | EIS at 4,000 bracket | 4,000 | EE 7.90, ER 7.90 | PERKESO EIS schedule | `eis-4000-bracket` | Eligible employee |
| PCB-01 | MTD single, no children | 5,000/mo | PCB per LHDN spec | LHDN Computerised MTD 2026 | `pcb-single-5000` | YTD = 0 |
| PCB-02 | MTD married, spouse not working | 6,000/mo | PCB per LHDN spec | LHDN Computerised MTD 2026 | `pcb-married-6000` | TP1 reliefs applied |
| PCB-03 | Mid-year joiner TP3 opening | YTD gross 30k | Annualized remaining periods | LHDN spec § annualization | `pcb-tp3-opening` | Uses opening YTD |
| HRDF-01 | 1% levy on eligible wage | 5,000 | ER 50 | HRD Corp levy | `hrdf-5000` | Branch `hrdf_enabled` |
| NET-01 | Full pipeline net pay | BASIC 5,000 | Net = gross − statutory | Domain `computeEmployeePayrun` | `item-components.test.ts` | Component rows persisted |
| ZAKAT-01 | Zakat rebate reduces PCB | zakat 500 annual | Lower PCB vs baseline | LHDN TP1 | `pcb-zakat-rebate` | TP1 zakat field |

## Verification commands

```bash
pnpm test tests/migration/payroll-golden.test.ts
pnpm test tests/integration/payroll.test.ts
pnpm test tests/payroll/item-components.test.ts
```

## Manual spot-check (optional)

When payroll.my or Kakitangan trial is available, re-run rows EPF-02 and PCB-01 for the same employee profile and record variance here.

_Last updated: Jul 2026_
