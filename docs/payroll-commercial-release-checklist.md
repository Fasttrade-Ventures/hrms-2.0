# Payroll module — commercial release checklist

Status snapshot after QA phases 1–5 (Jul 2026). Use this before selling payroll to customers.

## Release readiness summary

| Area | Status | Notes |
|------|--------|-------|
| Core payrun (monthly) | **Ready** | Generate, edit, workflow, YTD on lock |
| Statutory accuracy (EPF/SOCSO/EIS) | **Ready** | Matches PERKESO/KWSP tables; golden + benchmark tests |
| PCB / MTD | **Ready** | TP1 spouse/children wired; SOCSO/EIS annual reliefs in `pcbMtdFull` |
| Payslip view (employee) | **Ready** | Locked payruns only |
| Payslip email | **Beta** | Queue + outbox send + daily cron; needs `RESEND_API_KEY` + `MAIL_FROM` |
| Bank / statutory exports | **Beta** | Validated headers + branch employer codes; simplified file bodies |
| Year-end CP8D | **Ready** | YTD-only CSV generation |
| Year-end EA PDF | **Ready** | HR year-end UI + per-employee actions |
| Weekly / bi-weekly | **Ready** | `period_week` in payrun wizard |
| Rule packs (DB) | **Beta** | Seeded + metadata loader; calculations still use hardcoded bands |
| Multi-org SaaS | **Not ready** | `DEFAULT_ORGANIZATION_ID` single-tenant pattern |

**Verdict:** Ready for **commercial pilot** on monthly/weekly payroll with HR-validated exports. Full GA still needs DB integration tests and production rule-pack wiring.

---

## P0 — Must fix before commercial GA

| # | Item | Owner area | Status |
|---|------|------------|--------|
| 1 | PCB SOCSO + EIS as annual reliefs (LHDN spec §6.6) | `packages/domain/src/payroll/pcb-mtd.ts` | ✅ Done |
| 2 | Statutory export files validated against bank/KWSP/PERKESO upload specs | `apps/web/src/lib/payroll/exports/` | 🟡 Basic validation + tests |
| 3 | Real employer EPF/SOCSO registration on exports (not `EMPLOYER` placeholder) | exports + branch settings | ✅ Branch fields + resolver |
| 4 | DB integration tests: draft→lock, YTD, immutability, negative-net gate | `tests/integration/` | 🟡 Workflow unit tests; no live DB |
| 5 | EA PDF UI (per employee + bulk) | year-end pages + actions | ✅ Done |
| 6 | Weekly/bi-weekly payrun wizard (`period_week`) | payrun wizard + validation | ✅ Done |
| 7 | Runtime rule pack loader (`lib/payroll/rules.ts`) | generate + edit | 🟡 Metadata loader only |
| 8 | Pay group / component CRUD in org settings (currently read-only) | organization pages | ✅ Done |

---

## P1 — Should have for GA

| # | Item | Status |
|---|------|--------|
| 1 | `payroll_processor` / `payroll_approver` roles (not only `hr_administrator`) | ✅ Done |
| 2 | EPF Third Schedule `ceil_rm50` wage rounding option | ✅ Done |
| 3 | Foreign worker EPF 2% + employer 12%/13% wage threshold | ✅ Done |
| 4 | Golden tests use `pcbMtdFull` (production path), retire `pcbMtdComputerised` divergence | 🟡 Partial |
| 5 | SOCSO/PCB/HRDF export unit tests | ✅ Done |
| 6 | Employee payroll HR panel when tax profile missing (auto-create) | ✅ Done |
| 7 | CP8D from YTD-only (no payrun item fallback ambiguity) | ✅ Done |
| 8 | Director payroll read-only verified E2E | 🟡 Route added; manual E2E pending |

---

## P2 — Post-GA / Pro tier

| Item | Status |
|------|--------|
| Payroll anomaly detection (`anomaly_flags`) | ✅ Done |
| Duty segregation (approver ≠ last editor) | ✅ Done |
| In-app “compare with calculator” on payrun preview | ✅ Done |
| LINDUNG employer contribution | ✅ Done |
| Deprecated `lock-payrun-button.tsx` cleanup | ✅ Removed |

---

## Completed in QA phases 1–5

### Phase 1 — Benchmark matrix
- `docs/payroll-calculator-benchmark.md`
- `packages/testkit/src/fixtures/calculator-benchmarks.json`

### Phase 2 — Automated tests
- `tests/payroll/calculator-benchmark.test.ts` (full pipeline)
- `packages/domain/src/payroll/tp1-reliefs.test.ts`
- `tests/payroll/tp1-profile.test.ts`

### Phase 3 — External site QA
- Documented Fincrew / payroll.my / malaysiasalary variances in benchmark doc
- malaysiasalary SOCSO marked **non-authoritative**

### Phase 4 — HRMS fixes
- ✅ TP1 child + spouse reliefs wired (`generate.ts`, `edit.ts`, `tp1-profile.ts`)
- ✅ PCB married income-after-EPF threshold (RM 3,851 / RM 2,851)
- ✅ Payslip email outbox handler (`payroll.payslip_available`)
- ✅ Daily cron `/api/cron/payslip-email`

### Phase 5 — In-app validation
- Benchmark tests run in CI via `pnpm test`
- Manual spot-check template in benchmark doc

---

## Pre-launch verification commands

```bash
pnpm typecheck
pnpm test
pnpm seed-org-catalogs
pnpm seed-payroll-rules
# After locking a payrun with pay_date = today:
pnpm payroll:payslip-email
# Then trigger outbox (or wait for cron):
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/payslip-email
```

## Environment required for production payroll

| Variable | Purpose |
|----------|---------|
| `DEFAULT_ORGANIZATION_ID` | Tenant scope |
| `RESEND_API_KEY` + `MAIL_FROM` | Payslip + notification email |
| `CRON_SECRET` | Payslip email cron |
| `NEXT_PUBLIC_APP_URL` | Payslip links in email |
| `R2_*` | Export file storage |

---

## Recommended commercial packaging

| Tier | Include |
|------|---------|
| **Core** | Monthly payrun, payslips, TP1, basic exports |
| **Pro** | Scheduled payslip email, CP8D, bank export, HRDF/LINDUNG |
| **Enterprise** | EA bulk, rule-pack admin, multi-branch export compliance, duty segregation |

_Last updated: Jul 2026_
