# Payroll Module (Malaysia) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship production-grade Malaysia payroll — official KWSP/PERKESO/LHDN statutory accuracy, full pay component engine, monthly/weekly/bi-weekly pay groups, OT/claims/leave feeds, draft→edit→review→approve→lock workflow, per-branch bank/statutory exports, EA/CP8D year-end, and scheduled payslip email.

**Architecture:** Statutory math lives in `packages/domain/src/payroll/` (framework-free, `decimal.js`). Effective-dated rule packs load from `statutory_rule_versions` (seeded from `malaysia-payroll-official-2026.json`). Payrun generation is a deterministic pipeline in `packages/domain/src/payroll/payrun-pipeline.ts`, orchestrated by `apps/web/src/lib/payroll/`. All mutations via server actions with `requireModule("payroll")` + role/permission checks.

**Tech Stack:** Next.js App Router, Supabase PostgreSQL + RLS, `@hrms/domain`, `@hrms/validation`, Zod, Vitest, R2 (export files), `queueNotification` + `logAuditEvent`.

**Spec:** [2026-07-27-payroll-module-design.md](../specs/2026-07-27-payroll-module-design.md)

## Global Constraints

- Tenant isolation: every query filters by `organization_id`; RLS on all tables.
- Money: **never** JS `number` for payroll math — use `decimal.js` via `@hrms/domain` `money()`.
- Timezone: business rules in `Asia/Kuala_Lumpur`.
- Module gate: `requireModule("payroll")` on all payroll pages/actions.
- Mandatory statutory (EPF, SOCSO, EIS, PCB) **cannot be disabled**; HRDF/LINDUNG optional per branch.
- Locked payruns are **immutable** (existing DB trigger + integration test).
- Statutory export files: **one file per branch**, never merged.
- Accuracy bar: **RM0.00 variance** on statutory lines for golden test set.
- `DEPLOYMENT_MODE=standalone`: `DEFAULT_ORGANIZATION_ID` env for org scope.
- No legacy payrun import; YTD via TP3/opening balances only.
- Director payroll routes: **read-only** drill-down.

---

## File map

| File | Responsibility |
|------|----------------|
| `malaysia-payroll-official-2026.json` | Reference schedules (repo root) |
| `supabase/migrations/20260727220000_payroll_malaysia.sql` | Schema extensions §9 of spec |
| `packages/domain/src/payroll/types.ts` | Rule DTOs, payrun input/output types |
| `packages/domain/src/payroll/rules.ts` | Load/parse rule pack payloads |
| `packages/domain/src/payroll/socso.ts` | SOCSO Cat 1/2 band lookup |
| `packages/domain/src/payroll/malaysia-statutory.ts` | Extend EPF/EIS/PCB (existing) |
| `packages/domain/src/payroll/pcb-mtd.ts` | Full LHDN Computerised MTD + zakat rebate |
| `packages/domain/src/payroll/payrun-pipeline.ts` | End-to-end line computation |
| `packages/domain/src/payroll/proration.ts` | Working-day proration, unpaid leave |
| `packages/domain/src/payroll/ot.ts` | Employment Act OT formula |
| `packages/domain/src/payroll/ytd.ts` | YTD projection helpers |
| `packages/domain/src/payroll/*.test.ts` | Domain unit tests |
| `packages/testkit/src/fixtures/payroll-golden-cases.json` | Golden cases |
| `packages/validation/src/payroll.ts` | Zod schemas |
| `apps/web/src/lib/payroll/seed.ts` | Component catalog + org bootstrap |
| `apps/web/src/lib/payroll/rules.ts` | Fetch active `statutory_rule_versions` |
| `apps/web/src/lib/payroll/queries.ts` | List/detail payruns, components, YTD |
| `apps/web/src/lib/payroll/generate.ts` | Draft payrun orchestration |
| `apps/web/src/lib/payroll/edit.ts` | Draft line edits |
| `apps/web/src/lib/payroll/workflow.ts` | Submit, approve, lock |
| `apps/web/src/lib/payroll/feeds/*.ts` | OT, claims, leave, attendance |
| `apps/web/src/lib/payroll/exports/bank.ts` | Bank file generators |
| `apps/web/src/lib/payroll/exports/statutory.ts` | EPF, SOCSO, PCB, HRDF |
| `apps/web/src/lib/payroll/exports/year-end.ts` | EA PDF, CP8D |
| `apps/web/src/lib/hr/payroll.ts` | Refactor to thin wrapper over `lib/payroll/*` |
| `apps/web/src/app/(hr)/hr/payroll/**` | HR routes |
| `apps/web/src/app/(director)/director/payroll/**` | Director read-only |
| `apps/web/src/components/hr/payroll/**` | Payrun UI |
| `tests/integration/payroll.test.ts` | Integration tests |
| `tests/migration/payroll-golden.test.ts` | Golden statutory tests |
| `docs/payroll-accuracy-matrix.md` | Manual cross-check log |
| `scripts/smoke-test.ts` | Payroll route/table guards |

---

### Task 1: Rule pack types + SOCSO calculator + golden tests

**Files:**
- Create: `packages/domain/src/payroll/types.ts`
- Create: `packages/domain/src/payroll/rules.ts`
- Create: `packages/domain/src/payroll/socso.ts`
- Create: `packages/domain/src/payroll/socso.test.ts`
- Modify: `packages/domain/src/payroll/malaysia-statutory.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/testkit/src/fixtures/payroll-golden-cases.json`
- Modify: `tests/migration/payroll-golden.test.ts`

**Interfaces:**
- Produces: `type SocsoCategory = "cat1" | "cat2"`
- Produces: `detectSocsoCategory(dateOfBirth: string, asOf: string): SocsoCategory`
- Produces: `lookupSocsoContribution(wage: Money, category: SocsoCategory, rules: PerkesoSocsoRules): { employee: Money; employer: Money; wageBand: number }`
- Produces: `type PerkesoSocsoRules = { bands: Array<{ maxWage: number; employee: number; employer: number }> }`

- [ ] **Step 1: Write failing SOCSO tests**

Create `packages/domain/src/payroll/socso.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { money } from "../money";
import { detectSocsoCategory, lookupSocsoContribution } from "./socso";
import { CAT1_BANDS_SAMPLE } from "./socso-fixtures";

describe("detectSocsoCategory", () => {
  it("returns cat1 for employee under 60", () => {
    expect(detectSocsoCategory("1990-01-01", "2026-07-01")).toBe("cat1");
  });

  it("returns cat2 for employee 60 and above", () => {
    expect(detectSocsoCategory("1960-01-01", "2026-07-01")).toBe("cat2");
  });
});

describe("lookupSocsoContribution", () => {
  it("caps wage at RM6000 for cat1", () => {
    const result = lookupSocsoContribution(money(7500), "cat1", CAT1_BANDS_SAMPLE);
    expect(result.wageBand).toBe(6000);
    expect(result.employee.toNumber()).toBeGreaterThan(0);
    expect(result.employer.toNumber()).toBeGreaterThan(result.employee.toNumber());
  });

  it("returns lower contribution for RM4000 wage band", () => {
    const low = lookupSocsoContribution(money(4000), "cat1", CAT1_BANDS_SAMPLE);
    const high = lookupSocsoContribution(money(6000), "cat1", CAT1_BANDS_SAMPLE);
    expect(high.employee.gt(low.employee)).toBe(true);
  });
});
```

Create `packages/domain/src/payroll/socso-fixtures.ts` with a minimal 3-band excerpt from `malaysia-payroll-official-2026.json` for tests.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/domain/src/payroll/socso.test.ts --maxWorkers=1`

Expected: FAIL — modules not found

- [ ] **Step 3: Implement SOCSO + category detection**

Create `packages/domain/src/payroll/socso.ts`:

```typescript
import { money, type Money } from "../money";

export type SocsoCategory = "cat1" | "cat2";

export type PerkesoSocsoRules = {
  bands: Array<{ maxWage: number; employee: number; employer: number }>;
};

export function detectSocsoCategory(dateOfBirth: string, asOf: string): SocsoCategory {
  const dob = new Date(dateOfBirth);
  const ref = new Date(asOf);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age >= 60 ? "cat2" : "cat1";
}

export function lookupSocsoContribution(
  wage: Money,
  category: SocsoCategory,
  rules: PerkesoSocsoRules,
): { employee: Money; employer: Money; wageBand: number } {
  if (category === "cat2") {
    // Cat 2 uses separate schedule — load from rules payload at runtime
    const capped = Math.min(wage.toNumber(), rules.bands[rules.bands.length - 1]?.maxWage ?? 6000);
    const band = rules.bands.find((b) => capped <= b.maxWage) ?? rules.bands[rules.bands.length - 1];
    return {
      wageBand: band.maxWage,
      employee: money(band.employee),
      employer: money(band.employer),
    };
  }
  const capped = Math.min(wage.toNumber(), 6000);
  const band = rules.bands.find((b) => capped <= b.maxWage) ?? rules.bands[rules.bands.length - 1];
  return {
    wageBand: band.maxWage,
    employee: money(band.employee),
    employer: money(band.employer),
  };
}
```

- [ ] **Step 4: Extend golden fixture for SOCSO**

Update `packages/testkit/src/fixtures/payroll-golden-cases.json` — replace `socso-ceiling-6000` placeholder `expected` with real `socsoEmployee` / `socsoEmployer` values from official table.

Update `tests/migration/payroll-golden.test.ts` to assert SOCSO outputs (not just `wageForSocso` note).

- [ ] **Step 5: Run golden tests**

Run: `pnpm exec vitest run tests/migration/payroll-golden.test.ts packages/domain/src/payroll --maxWorkers=1`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/payroll packages/testkit/src/fixtures/payroll-golden-cases.json \
  tests/migration/payroll-golden.test.ts packages/domain/src/index.ts
git commit -m "Add SOCSO category detection and band lookup with golden tests."
```

---

### Task 2: Full PCB/MTD engine (zakat, reliefs, weekly/bi-weekly)

**Files:**
- Create: `packages/domain/src/payroll/pcb-mtd.ts`
- Create: `packages/domain/src/payroll/pcb-mtd.test.ts`
- Create: `packages/domain/src/payroll/ytd.ts`
- Modify: `packages/domain/src/payroll/malaysia-statutory.ts` — re-export or delegate to `pcb-mtd.ts`
- Modify: `packages/testkit/src/fixtures/payroll-golden-cases.json`

**Interfaces:**
- Produces: `type PayFrequency = "monthly" | "weekly" | "biweekly"`
- Produces: `type Tp1Reliefs = { personal: Money; spouse: Money; children: Money; epfLifeInsurance: Money; socsoEis: Money; zakatAnnual: Money; other: Money }`
- Produces: `pcbMtdFull(input: PcbMtdInput): Money` where `PcbMtdInput` includes `frequency`, `periodGross`, `ytd`, `tp1`, `month`, `ceil5Sen: true`

- [ ] **Step 1: Write failing PCB tests**

```typescript
import { describe, expect, it } from "vitest";

import { money } from "../money";
import { pcbMtdFull } from "./pcb-mtd";

describe("pcbMtdFull", () => {
  it("matches golden case pcb-4000-no-ytd", () => {
    const pcb = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(4000),
      periodEpf: money(480),
      tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      calendarMonth: 1,
      remainingPeriods: 12,
      ceil5Sen: true,
    });
    expect(pcb.toNumber()).toBeCloseTo(16.65, 1); // ceil 5 sen
  });

  it("reduces PCB when zakat annual declared on TP1", () => {
    const without = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(8000),
      periodEpf: money(880),
      tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      calendarMonth: 1,
      remainingPeriods: 12,
      ceil5Sen: true,
    });
    const withZakat = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(8000),
      periodEpf: money(880),
      tp1: { zakatAnnual: money(1200), spouse: money(0), children: money(0), other: money(0) },
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      calendarMonth: 1,
      remainingPeriods: 12,
      ceil5Sen: true,
    });
    expect(withZakat.lt(without)).toBe(true);
  });

  it("annualizes weekly pay at 52 periods", () => {
    const pcb = pcbMtdFull({
      frequency: "weekly",
      periodGross: money(1000),
      periodEpf: money(110),
      tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      calendarMonth: 1,
      remainingPeriods: 52,
      ceil5Sen: true,
    });
    expect(pcb.toNumber()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run packages/domain/src/payroll/pcb-mtd.test.ts --maxWorkers=1`

- [ ] **Step 3: Implement `pcb-mtd.ts`**

Move progressive tax bands from `malaysia-statutory.ts`. Add:
- Personal relief RM9,000
- EPF relief cap RM4,000/year
- Zakat as tax rebate (reduce annual tax, floor at 0)
- `remainingPeriods` from `ytd.ts` helper based on `PayFrequency`
- `ceilToNext5Sen` on final PCB

Create `packages/domain/src/payroll/ytd.ts`:

```typescript
export type PayFrequency = "monthly" | "weekly" | "biweekly";

export function remainingPeriodsInYear(
  frequency: PayFrequency,
  asOf: string,
): number {
  const date = new Date(asOf);
  const month = date.getMonth() + 1;
  if (frequency === "monthly") return Math.max(1, 13 - month);
  if (frequency === "weekly") {
    const week = getWeekOfYear(date);
    return Math.max(1, 53 - week);
  }
  const biweek = Math.ceil(getWeekOfYear(date) / 2);
  return Math.max(1, 27 - biweek);
}

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/payroll/pcb-mtd.ts packages/domain/src/payroll/pcb-mtd.test.ts \
  packages/domain/src/payroll/ytd.ts packages/domain/src/payroll/malaysia-statutory.ts
git commit -m "Implement full LHDN Computerised MTD with zakat rebate and pay frequency support."
```

---

### Task 3: Schema migration + statutory rule seed + component catalog

**Files:**
- Create: `supabase/migrations/20260727220000_payroll_malaysia.sql`
- Create: `apps/web/src/lib/payroll/seed.ts`
- Create: `apps/web/src/lib/payroll/types.ts`
- Create: `scripts/seed-payroll-rules.ts`
- Modify: `packages/validation/src/payroll.ts` (create)
- Modify: `packages/validation/src/index.ts`

**Interfaces:**
- Produces: `seedPayrollComponents(organizationId: string): Promise<void>`
- Produces: `seedStatutoryRuleVersions(): Promise<void>` — reads `malaysia-payroll-official-2026.json`
- Produces: `seedDefaultPayGroupsForBranches(organizationId: string): Promise<void>`

- [ ] **Step 1: Write migration**

Implement all §9 alters from spec:
- `branches`: `hrdf_enabled`, `hrdf_registration_number`, `hrdf_rate`, `lindung_enabled`, `default_pay_group_id`
- `pay_groups`: `branch_id`, `is_default`
- `payroll_payruns`: workflow columns, `payrun_type`, `scope`, `pay_date`, `period_week`; fix unique index
- `payroll_payrun_items`: `branch_id`, HRDF/LINDUNG, resolution flags, separate wage bases
- `payroll_components`: `is_hrdf`, `is_system`, `is_active`, `sort_order`
- New tables: `employee_compensation`, `employee_recurring_allowances`, `employee_tax_profiles`, `payroll_ytd_balances`, `payroll_exports`
- Extend immutability trigger to `payroll_item_components`

- [ ] **Step 2: Implement component seed**

`apps/web/src/lib/payroll/seed.ts` — insert all codes from spec §7 (BASIC, ALLOW_*, OT_PAY, CLAIM_*, DED_*, ER_*) with correct `is_epf/socso/eis/pcb/hrdf` flags. Set `is_system = true` for statutory codes.

- [ ] **Step 3: Rule seed script**

`scripts/seed-payroll-rules.ts` — parse JSON files, insert into `statutory_rule_versions` with `effective_from = '2026-01-01'` for each `rule_set`.

Run: `pnpm exec tsx scripts/seed-payroll-rules.ts`

- [ ] **Step 4: Zod schemas**

`packages/validation/src/payroll.ts`:

```typescript
import { z } from "zod";

export const createPayrunSchema = z.object({
  payGroupId: z.string().uuid().optional(),
  scope: z.enum(["pay_group", "org_wide"]),
  payrunType: z.enum(["regular", "adjustment"]).default("regular"),
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12).optional(),
  periodWeek: z.number().int().min(1).max(53).optional(),
  earningPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  earningPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const editPayrunLineSchema = z.object({
  payrunItemId: z.string().uuid(),
  componentCode: z.string().min(1),
  amount: z.number(),
});
```

- [ ] **Step 5: Apply migration locally**

Run: `pnpm supabase db reset` (or `migration up` per project convention)

Expected: migration applies without error

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260727220000_payroll_malaysia.sql apps/web/src/lib/payroll/seed.ts \
  scripts/seed-payroll-rules.ts packages/validation/src/payroll.ts packages/validation/src/index.ts
git commit -m "Add payroll Malaysia schema migration, component seed, and rule pack loader."
```

---

### Task 4: Employee compensation + tax profile (TP1/TP3)

**Files:**
- Create: `apps/web/src/lib/payroll/compensation.ts`
- Create: `apps/web/src/components/hr/employees/employee-compensation-panel.tsx`
- Create: `apps/web/src/components/hr/employees/employee-tax-profile-panel.tsx`
- Modify: `apps/web/src/app/(hr)/hr/employees/[employeeId]/page.tsx`
- Modify: `apps/web/src/lib/employees/update-employee.ts` — sync `basic_salary` ↔ `employee_compensation`
- Modify: `apps/web/src/app/(hr)/hr/actions.ts` — compensation/tax actions

**Interfaces:**
- Produces: `getEmployeeCompensation(employeeId): Promise<EmployeeCompensation>`
- Produces: `upsertEmployeeCompensation(input): Promise<void>`
- Produces: `getEmployeeTaxProfile(employeeId): Promise<EmployeeTaxProfile>`
- Produces: `upsertEmployeeTaxProfile(input): Promise<void>`
- Produces: `setYtdOpeningBalance(employeeId, year, balances): Promise<void>`

- [ ] **Step 1: Server lib**

`compensation.ts` handles:
- `pay_basis`: monthly | hourly | daily
- `basic_salary`, `hourly_rate`, `daily_rate`
- `voluntary_epf_extra_rate`
- `employee_recurring_allowances` CRUD (component_id + amount + effective dates)

- [ ] **Step 2: Tax profile UI**

TP1 sections: marital status, spouse working, child counts (from dependents), zakat annual, other reliefs JSON.

TP3 section: previous employer YTD (gross, EPF, PCB) — writes `payroll_ytd_balances` with `opening_balance = true`.

- [ ] **Step 3: Wire employee profile tabs**

Add **Compensation** and **Tax (TP1/TP3)** tabs on HR employee profile.

- [ ] **Step 4: Manual verify**

Edit employee basic salary + transport allowance; verify `employee_compensation` + `employee_recurring_allowances` rows.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/payroll/compensation.ts apps/web/src/components/hr/employees/employee-compensation-panel.tsx \
  apps/web/src/components/hr/employees/employee-tax-profile-panel.tsx apps/web/src/app/(hr)/hr/employees
git commit -m "Add employee compensation and TP1/TP3 tax profile management."
```

---

### Task 5: Payrun domain pipeline (basic + allowances + statutory)

**Files:**
- Create: `packages/domain/src/payroll/payrun-pipeline.ts`
- Create: `packages/domain/src/payroll/proration.ts`
- Create: `packages/domain/src/payroll/payrun-pipeline.test.ts`
- Create: `packages/domain/src/payroll/proration.test.ts`

**Interfaces:**
- Produces: `type PayrunComponentLine = { code: string; amount: Money; flags: ComponentFlags }`
- Produces: `computeEmployeePayrun(input: EmployeePayrunInput, rules: ActiveRulePacks): EmployeePayrunResult`
- `EmployeePayrunResult` includes: `lines`, `gross`, `epfEmployee`, `epfEmployer`, `socsoEmployee`, `socsoEmployer`, `eisEmployee`, `eisEmployer`, `pcb`, `hrdfEmployer`, `net`, `requiresResolution`, `wageBases`

- [ ] **Step 1: Write pipeline test**

```typescript
import { describe, expect, it } from "vitest";

import { money } from "../money";
import { computeEmployeePayrun } from "./payrun-pipeline";
import { RULES_FIXTURE_2026 } from "./payrun-pipeline-fixtures";

describe("computeEmployeePayrun", () => {
  it("computes basic salary with EPF SOCSO EIS PCB for citizen", () => {
    const result = computeEmployeePayrun(
      {
        payBasis: "monthly",
        basicSalary: money(5000),
        recurringAllowances: [{ code: "ALLOW_TRANSPORT", amount: money(300), flags: { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true } }],
        voluntaryEpfExtraRate: 0,
        eisEligible: true,
        nationality: "MY",
        dateOfBirth: "1990-05-01",
        asOf: "2026-07-31",
        frequency: "monthly",
        ytd: { gross: money(0), epf: money(0), pcb: money(0) },
        tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
        calendarMonth: 7,
        hrdfEnabled: false,
        lindungEnabled: false,
      },
      RULES_FIXTURE_2026,
    );
    expect(result.gross.toNumber()).toBe(5300);
    expect(result.epfEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.socsoEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.pcb.toNumber()).toBeGreaterThanOrEqual(0);
    expect(result.net.lte(result.gross)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement pipeline**

Order in `computeEmployeePayrun`:
1. Sum earning lines → gross
2. Per-flag wage bases
3. EPF (KWSP rates from rules by age/nationality + voluntary extra)
4. SOCSO (auto category unless override)
5. EIS
6. PCB via `pcbMtdFull`
7. HRDF if enabled
8. LINDUNG if enabled
9. net = gross - employee deductions; flag if net < 0

- [ ] **Step 3: Proration helper**

`proration.ts`:

```typescript
export function prorateMonthlySalary(
  monthlySalary: Money,
  workingDaysEmployed: number,
  workingDaysInPeriod: number,
): Money {
  if (workingDaysInPeriod <= 0) return money(0);
  return monthlySalary.mul(workingDaysEmployed).div(workingDaysInPeriod).toDecimalPlaces(2);
}

export function unpaidLeaveDeduction(
  monthlySalary: Money,
  unpaidDays: number,
  workingDaysInPeriod: number,
): Money {
  if (workingDaysInPeriod <= 0 || unpaidDays <= 0) return money(0);
  return monthlySalary.mul(unpaidDays).div(workingDaysInPeriod).toDecimalPlaces(2);
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/payroll/payrun-pipeline.ts packages/domain/src/payroll/proration.ts \
  packages/domain/src/payroll/*.test.ts packages/domain/src/payroll/*-fixtures.ts
git commit -m "Add payrun domain pipeline for basic salary, allowances, and full statutory stack."
```

---

### Task 6: Payrun generation + HR UI (draft)

**Files:**
- Create: `apps/web/src/lib/payroll/generate.ts`
- Create: `apps/web/src/lib/payroll/queries.ts`
- Create: `apps/web/src/app/(hr)/hr/payroll/new/page.tsx`
- Create: `apps/web/src/components/hr/payroll/create-payrun-wizard.tsx`
- Create: `apps/web/src/components/hr/payroll/payrun-detail.tsx`
- Create: `apps/web/src/components/hr/payroll/payrun-lines-table.tsx`
- Modify: `apps/web/src/app/(hr)/hr/payroll/page.tsx`
- Modify: `apps/web/src/app/(hr)/hr/payroll/[payrunId]/page.tsx`
- Modify: `apps/web/src/lib/hr/payroll.ts` — delegate to `lib/payroll/*`
- Modify: `apps/web/src/app/(hr)/hr/actions.ts`

**Interfaces:**
- Produces: `generateDraftPayrun(input: CreatePayrunInput): Promise<string>`
- Consumes: `computeEmployeePayrun` from domain
- Consumes: `getActiveRulePacks(asOf: string)` from `lib/payroll/rules.ts`

- [ ] **Step 1: `generate.ts`**

Replace inline math in `createDraftPayrun`:
- Resolve employee set by `scope` + `pay_group_id`
- Load compensation, recurring allowances, tax profile, YTD
- Call `computeEmployeePayrun` per employee
- Insert `payroll_payrun_items` + `payroll_item_components` rows
- Set `branch_id` on each item

- [ ] **Step 2: Create payrun wizard**

Fields: scope (pay group / org-wide), pay group picker, earning period (defaults from cutoff), pay date, type (regular/adjustment).

- [ ] **Step 3: Payrun detail page**

Summary cards: total gross, EPF, SOCSO, EIS, PCB, HRDF, net.
Lines table: employee, branch, gross, deductions, net, resolution flag.
Validation banner for unresolved items.

- [ ] **Step 4: Manual verify**

Create monthly payrun for default branch pay group; verify lines match domain test for sample employee.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/payroll apps/web/src/components/hr/payroll apps/web/src/app/(hr)/hr/payroll \
  apps/web/src/lib/hr/payroll.ts apps/web/src/app/(hr)/hr/actions.ts
git commit -m "Wire draft payrun generation to domain pipeline and enhance HR payrun UI."
```

---

### Task 7: Module feeds (OT, claims, leave, attendance, proration)

**Files:**
- Create: `apps/web/src/lib/payroll/feeds/ot.ts`
- Create: `apps/web/src/lib/payroll/feeds/claims.ts`
- Create: `apps/web/src/lib/payroll/feeds/leave.ts`
- Create: `apps/web/src/lib/payroll/feeds/attendance.ts`
- Create: `packages/domain/src/payroll/ot.ts`
- Create: `packages/domain/src/payroll/ot.test.ts`
- Modify: `apps/web/src/lib/payroll/generate.ts`
- Modify: claims schema/migration if `payroll_treatment` missing on `claim_categories`

**Interfaces:**
- Produces: `fetchApprovedOtForPeriod(employeeId, start, end): Promise<OtLine[]>`
- Produces: `fetchApprovedClaimsForPeriod(employeeId, start, end): Promise<ClaimLine[]>`
- Produces: `fetchUnpaidLeaveDays(employeeId, start, end): Promise<number>`
- Produces: `computeOtPay(hours, multiplier, monthlyBasic, divisor = 26): Money`

- [ ] **Step 1: OT domain**

```typescript
export function computeOtPay(
  hours: number,
  multiplier: number,
  monthlyBasic: Money,
  divisor = 26,
): Money {
  const hourlyRate = monthlyBasic.div(divisor);
  return hourlyRate.mul(hours).mul(multiplier).toDecimalPlaces(2);
}
```

- [ ] **Step 2: Feed queries**

OT: approved `overtime_requests` in earning period.
Claims: approved `claims` mapped via category `payroll_treatment`.
Leave: unpaid leave types × working days (reuse leave calendar helpers).
Attendance: sum hours for hourly employees.

- [ ] **Step 3: Integrate into `generate.ts`**

Before `computeEmployeePayrun`, merge feed lines into component list.

- [ ] **Step 4: Integration test**

`tests/integration/payroll.test.ts`:

```typescript
it("includes approved OT in gross and statutory base", async () => {
  // seed employee + approved OT request in period
  // generate payrun
  // assert OT_PAY component present and EPF > basic-only case
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/payroll/feeds packages/domain/src/payroll/ot.ts tests/integration/payroll.test.ts
git commit -m "Feed OT, claims, leave, and attendance into payrun generation."
```

---

### Task 8: Draft edits + workflow + YTD on lock

**Files:**
- Create: `apps/web/src/lib/payroll/edit.ts`
- Create: `apps/web/src/lib/payroll/workflow.ts`
- Create: `apps/web/src/components/hr/payroll/payrun-workflow-actions.tsx`
- Create: `apps/web/src/components/hr/payroll/edit-line-dialog.tsx`
- Modify: `apps/web/src/lib/employee/payslips.ts` — full component breakdown
- Modify: `packages/domain/src/roles.ts` usage — `payroll_processor`, `payroll_approver` permissions

**Interfaces:**
- Produces: `editPayrunLine(payrunItemId, componentCode, amount): Promise<void>` — draft only; recalculates statutory
- Produces: `submitPayrunForReview(payrunId): Promise<void>`
- Produces: `approvePayrun(payrunId): Promise<void>` — blocks if `requires_resolution` items remain
- Produces: `lockPayrun(payrunId): Promise<void>` — updates `payroll_ytd_balances`

- [ ] **Step 1: Edit line**

On amount change: update `payroll_item_components`, re-run `computeEmployeePayrun` for that employee only, update item totals.

- [ ] **Step 2: Workflow state machine**

```
draft → in_review → approved → locked
```

Write `payroll_payrun_status_log` on each transition. Check permissions:
- Submit: `payroll_processor` or `hr_administrator`
- Approve/Lock: `payroll_approver` or `hr_administrator`

- [ ] **Step 3: YTD update on lock**

For each item, upsert `payroll_ytd_balances` for `period_year`:
- Add period gross, epf, socso, eis, pcb to YTD columns

- [ ] **Step 4: Enhanced payslip**

Show all `payroll_item_components` grouped earnings/deductions/employer.

- [ ] **Step 5: Integration test immutability**

Assert update on locked payrun item throws.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/payroll/edit.ts apps/web/src/lib/payroll/workflow.ts \
  apps/web/src/components/hr/payroll tests/integration/payroll.test.ts apps/web/src/lib/employee/payslips.ts
git commit -m "Add payrun line editing, review workflow, YTD accumulation on lock."
```

---

### Task 9: Bank exports (per branch)

**Files:**
- Create: `apps/web/src/lib/payroll/exports/bank.ts`
- Create: `apps/web/src/lib/payroll/exports/store.ts`
- Create: `apps/web/src/components/hr/payroll/payrun-export-panel.tsx`
- Modify: `apps/web/src/app/(hr)/hr/payroll/[payrunId]/page.tsx`

**Interfaces:**
- Produces: `generateBankExport(payrunId, branchId, format: "bank_csv" | "bank_maybank" | "bank_cimb"): Promise<{ exportId: string; downloadUrl: string }>`
- Stores file in R2; records `payroll_exports` row; `logAuditEvent("payroll.exported")`

- [ ] **Step 1: Generic CSV**

Columns: employee name, IC, bank name, account number, net pay, reference (`PAY-{period}-{employee_number}`).

- [ ] **Step 2: Maybank + CIMB column maps**

Document column order in code comments from bank spec PDFs. One row per employee with net pay > 0.

- [ ] **Step 3: Export UI**

Branch picker → format picker → Generate → signed download link.

Only enabled for `approved` or `locked` payruns (draft shows warning).

- [ ] **Step 4: Manual verify**

Lock payrun; export CSV for branch A; verify row count matches employees in branch.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/payroll/exports apps/web/src/components/hr/payroll/payrun-export-panel.tsx
git commit -m "Add per-branch bank salary export formats."
```

---

### Task 10: Statutory exports (per branch)

**Files:**
- Create: `apps/web/src/lib/payroll/exports/statutory.ts`
- Create: `apps/web/src/lib/payroll/exports/epf.ts`
- Create: `apps/web/src/lib/payroll/exports/socso.ts`
- Create: `apps/web/src/lib/payroll/exports/pcb.ts`
- Create: `apps/web/src/lib/payroll/exports/hrdf.ts`

**Interfaces:**
- Produces: `generateStatutoryExport(payrunId, branchId, type: "epf" | "socso" | "pcb" | "hrdf"): Promise<ExportResult>`

- [ ] **Step 1: EPF i-Akaun text format**

Fixed-width or delimiter format per KWSP spec: employer number, employee EPF number, IC, name, contributable wage, employee share, employer share.

- [ ] **Step 2: PERKESO ASSIST / SOCSO**

Employee SOCSO number, wage, employee/employer contribution, EIS amounts, LINDUNG if enabled.

- [ ] **Step 3: LHDN PCB / CP39**

Employee tax number, PCB amount, month/year.

- [ ] **Step 4: HRDF**

Only when `branches.hrdf_enabled`; employer levy totals per employee wage base.

- [ ] **Step 5: Unit tests for file content**

```typescript
it("epf export includes one line per employee in branch", () => {
  const content = buildEpfFile(lines, employerEpfNumber);
  expect(content.split("\n").filter(Boolean)).toHaveLength(3);
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/payroll/exports
git commit -m "Add per-branch EPF, SOCSO, PCB, and HRDF statutory export generators."
```

---

### Task 11: Year-end EA + CP8D

**Files:**
- Create: `apps/web/src/lib/payroll/exports/year-end.ts`
- Create: `apps/web/src/app/(hr)/hr/payroll/year-end/page.tsx`
- Create: `apps/web/src/components/hr/payroll/year-end-panel.tsx`

**Interfaces:**
- Produces: `generateEaPdf(employeeId, calendarYear): Promise<Buffer>`
- Produces: `generateCp8dExport(organizationId, calendarYear, branchId?): Promise<ExportResult>`

- [ ] **Step 1: EA PDF**

Use existing PDF pattern from attendance timesheet. Fields: employer info, employee info, annual gross, EPF, SOCSO, EIS, PCB, benefits in kind (placeholder 0 in v1).

- [ ] **Step 2: CP8D data file**

Aggregate `payroll_ytd_balances` + locked payrun items for calendar year; LHDN column layout.

- [ ] **Step 3: Year-end UI**

Select year → generate all EA PDFs (zip) or per employee; CP8D per branch.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/payroll/exports/year-end.ts apps/web/src/app/(hr)/hr/payroll/year-end \
  apps/web/src/components/hr/payroll/year-end-panel.tsx
git commit -m "Add EA PDF generation and CP8D year-end export."
```

---

### Task 12: Payslip email job + Director read-only + settings UI

**Files:**
- Create: `apps/web/src/lib/payroll/jobs/payslip-email.ts`
- Create: `apps/web/src/app/(director)/director/payroll/page.tsx`
- Create: `apps/web/src/app/(director)/director/payroll/[payrunId]/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/payroll/settings/components/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/payroll/settings/pay-groups/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/payroll/settings/statutory/page.tsx`
- Modify: `apps/web/src/lib/portal-nav.ts`
- Modify: `scripts/jobs/` or scheduled job registry

**Interfaces:**
- Produces: `runPayslipEmailJob(asOf: string): Promise<number>` — emails for payruns where `pay_date = asOf` and `status = locked`

- [ ] **Step 1: Payslip email job**

Query locked payruns due today → queue email per employee with payslip link (reuse `queueNotification` + mail outbox).

- [ ] **Step 2: Director routes**

Reuse `payrun-detail.tsx` with `readOnly` prop; `requireRole("director")`; no action buttons.

- [ ] **Step 3: Settings pages**

- Components: list seeded + custom (toggle active, cannot delete system codes)
- Pay groups: CRUD per branch default
- Statutory: list rule versions, activate future packs

- [ ] **Step 4: Register daily job**

08:00 `Asia/Kuala_Lumpur` — `payroll.payslip_email`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/payroll/jobs apps/web/src/app/(director)/director/payroll \
  apps/web/src/app/(hr)/hr/payroll/settings apps/web/src/lib/portal-nav.ts
git commit -m "Add payslip email job, director read-only payroll, and payroll settings UI."
```

---

### Task 13: Tests, smoke test, accuracy matrix, docs

**Files:**
- Modify: `tests/integration/payroll.test.ts`
- Modify: `tests/migration/payroll-golden.test.ts`
- Modify: `scripts/smoke-test.ts`
- Create: `docs/payroll-accuracy-matrix.md`
- Modify: `docs/features.md`
- Modify: `docs/superpowers/specs/2026-07-27-payroll-module-design.md` — status + exit criteria

- [ ] **Step 1: Integration tests**

Cover:
- Draft → submit → approve → lock workflow
- Locked immutability
- YTD increment on lock
- Per-branch export row counts
- Negative net blocks approve

- [ ] **Step 2: Smoke test**

Add guards: `/hr/payroll`, `/hr/payroll/new`, `/director/payroll`, tables `employee_compensation`, `payroll_ytd_balances`, `payroll_exports`.

- [ ] **Step 3: Accuracy matrix**

Create `docs/payroll-accuracy-matrix.md` with template rows. Fill minimum 10 cases from:
- KWSP published examples
- PERKESO rate tables
- LHDN MTD spec examples
- Manual spot-check notes (payroll.my / Kakitangan when accessible)

- [ ] **Step 4: Full verification**

Run: `pnpm typecheck && pnpm test && pnpm exec tsx scripts/smoke-test.ts`

Expected: all pass

- [ ] **Step 5: Update docs**

Mark `docs/features.md` §8 items ✅ per exit criteria.
Update spec status to **Implemented** and check exit criteria boxes.

- [ ] **Step 6: Commit**

```bash
git add tests/integration/payroll.test.ts scripts/smoke-test.ts docs/payroll-accuracy-matrix.md \
  docs/features.md docs/superpowers/specs/2026-07-27-payroll-module-design.md
git commit -m "Add payroll integration tests, smoke guards, accuracy matrix, and docs."
```

---

## Spec coverage self-review

| Spec section | Task |
|--------------|------|
| §6 Statutory engine | 1, 2, 5 |
| §7 Component catalog | 3, 4 |
| §8 Payrun pipeline | 5, 6, 7 |
| §9 Data model | 3 |
| §10 Exports | 9, 10, 11 |
| §11 Application layer | 6–12 |
| §12 Testing | 1, 2, 13 |
| §13 Build order | Tasks 1–13 map to phases A–I |
| §17 Exit criteria | Task 13 verification |

## Execution notes

- **Big-bang release** but tasks are strictly ordered — do not skip Task 1–2 (statutory) before Task 6 (generation).
- Weekly/bi-weekly payruns require `period_week` on payrun; wizard must show week picker when pay group cycle ≠ monthly.
- When `pnpm supabase db reset` is disruptive, apply single migration in dev only.
- User has **no payroll.my account** — accuracy matrix relies on official schedules + optional third-party trials.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-27-payroll-module.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
