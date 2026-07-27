# Payroll Module (Malaysia) — Design Spec

**Date:** 27 Jul 2026  
**Status:** Implemented — see [implementation plan](../plans/2026-07-27-payroll-module.md) and [accuracy matrix](../../payroll-accuracy-matrix.md)  
**Scope:** Core — full Malaysia payroll with official statutory accuracy  
**Related:** [features.md](../../features.md) §8 · [developer-brief.md](../../developer-brief.md) · [development-phases.md](../../development-phases.md) Phase 9

---

## 1. Summary

Upgrade the scaffold **Payroll** module into a **production-grade Malaysia payroll** system that computes payruns using **official KWSP, PERKESO, and LHDN rules** — not legacy approximations.

**v1 delivers:**

1. **Pay groups** — monthly, weekly, and bi-weekly cycles with cutoff-based earning periods; one default pay group per branch  
2. **Pay component engine** — seeded Malaysian defaults (basic, allowances, OT, claims, deductions, employer contributions); statutory base flags per component  
3. **Full statutory calculation** — EPF (latest KWSP Third Schedule), SOCSO (auto-detected category), EIS, PCB/MTD (LHDN Computerised Method), optional HRDF (per branch), optional LINDUNG 24 Jam (admin toggle)  
4. **Variable pay feeds** — approved OT, claims, unpaid leave, join/leave proration (working days)  
5. **Payrun workflow** — Draft → manual line edits → submit for review → approve → lock (immutable)  
6. **YTD tracking** — full calendar-year totals for statutory and PCB; TP1/TP3 capture for reliefs and mid-year joiners  
7. **Exports** — multi-bank salary files; statutory files **per branch** (EPF, SOCSO, PCB, HRDF)  
8. **Year-end** — EA (Borang EA) PDF per employee; CP8D data export  
9. **Payslip delivery** — employee portal + scheduled email batch on pay date  
10. **Director read-only** — drill-down to individual payslips  

**Architecture choice:** All payroll math lives in **`packages/domain`** (framework-free, `decimal.js`). Runtime loads **effective-dated statutory rule packs** from `statutory_rule_versions` (shipped with app; admin activates on effective date). Payrun generation is a **deterministic pipeline**: gather inputs → build component lines → derive statutory bases → compute statutory → net pay → persist with audit trail.

**Accuracy bar:** Match **official published schedules and LHDN Computerised MTD**. Validate via automated golden tests + cross-check against official calculators and publicly available third-party payroll tools (payroll.my, Kakitangan/Payboy where accessible). No legacy PHP payrun reconciliation available.

---

## 2. Product decisions (27 Jul 2026)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Org model | One company, **multiple branches** with different pay groups/cutoffs |
| 2 | Pay cycles | **Monthly + weekly + bi-weekly** from day one |
| 3 | Accuracy bar | Match **official KWSP / PERKESO / LHDN** schedules |
| 4 | Statutory scope | All relevant MY statutory; **mandatory cannot be disabled**; optional (HRDF, LINDUNG) **admin/branch toggle** |
| 5 | Workflow | **Draft → manual edits → review → approve → lock** |
| 6 | Variable pay | Basic + allowances + OT + claims + unpaid leave — **all auto-fed** |
| 7 | Workforce | Malaysian + foreign + contract/part-time mix |
| 8 | EPF | **Latest KWSP rules** — Third Schedule, age/nationality, effective-dated |
| 9 | SOCSO | **Auto-detect** Cat 1 / Cat 2 from DOB + employment type |
| 10 | PCB | **Full LHDN Computerised MTD** with all standard reliefs |
| 11 | HRDF | **Per-branch enable** when branch is HRDF-registered |
| 12 | Pay groups | **One default pay group per branch**; cutoff-based earning periods |
| 13 | OT | **Employment Act** formula + standard multipliers (1.5× / 2× / 3× PH) |
| 14 | Unpaid leave | Deduct by **working days** in month (exclude weekends + branch holidays) |
| 15 | Claims | **Per-category** taxable vs reimbursement (industry standard) |
| 16 | Join/leave proration | **Working days** proration |
| 17 | Components | **Pre-seeded MY defaults**; HR can add custom components |
| 18 | Statutory base | Component flags (`is_epf`, `is_socso`, `is_eis`, `is_pcb`, `is_hrdf`) + org exempt list |
| 19 | Bank export | **Multiple bank formats** (Maybank, CIMB, generic CSV, extensible) |
| 20 | Statutory exports | **Full release** — EPF, SOCSO, PCB, HRDF, EA, CP8D |
| 21 | Statutory file scope | **One file per branch** per export |
| 22 | Approvals | Payroll Processor prepares → Payroll Approver approves → Lock |
| 23 | Payslips | Portal + **scheduled email on pay date** |
| 24 | Rounding | Malaysian industry standard (see §6.9) |
| 25 | Negative net | **Flag for HR resolution** before approve |
| 26 | Backpay | Retro component **+** separate adjustment/bonus payrun type |
| 27 | YTD | Full calendar-year YTD + **TP3** for mid-year joiners |
| 28 | Legacy cutover | **Fresh start** — manual YTD opening balances; parallel run recommended |
| 29 | Payrun scope | HR chooses **per pay group OR org-wide** batch |
| 30 | Pay date | **Manual per payrun** |
| 31 | Voluntary EPF | Employee **extra % above 11%** (per employee setting) |
| 32 | Rule updates | **Hybrid** — app ships rule packs; admin previews and activates |
| 33 | LINDUNG 24 Jam | **Admin toggle** (optional statutory) |
| 34 | Director | **Full read-only** payrun + individual payslip drill-down |
| 35 | Phasing | **Big-bang** full module (internal build order in §15) |
| 36 | Benchmark tools | Official schedules + payroll.my + other HRMS; **no payroll.my account** available |
| 37 | Legacy samples | **No** legacy PHP payruns for reconciliation |
| 38 | Deadline | **No fixed deadline** — accuracy over speed |
| 39 | Zakat | **TP1 rebate reduces PCB**; optional post-tax zakat deduction component (see §6.10) |
| 40 | Weekly/bi-weekly PCB | **LHDN annualization** with frequency-aware remaining periods (see §6.11) |

---

## 3. Goals

### HR Administrator — Payroll hub (`/hr/payroll`)

- **Payrun list** — filter by status, pay group, branch, period; create new payrun  
- **Create payrun** — choose pay group or org-wide; set earning period (defaults from cutoff); set pay date; generate draft  
- **Payrun detail** (`/hr/payroll/[payrunId]`) — summary totals, employee lines table, statutory breakdown, validation warnings  
- **Edit draft lines** — add/remove/adjust component amounts per employee; add one-off earning/deduction  
- **Submit for review** → **Approve** → **Lock** (with permission checks and status log)  
- **Resolve flags** — negative net pay, missing statutory IDs, zero basic salary  
- **Exports panel** — bank file + statutory files **per branch**  
- **Year-end** — generate EA PDFs; export CP8D data  
- **Settings** — pay components catalog, pay groups, branch HRDF/LINDUNG toggles, statutory rule activation  

### Payroll Processor / Approver permissions

| Action | Processor | Approver | HR Admin (both) |
|--------|-----------|----------|-----------------|
| Create draft | ✅ | ✅ | ✅ |
| Edit lines | ✅ | ❌ (after submit) | ✅ until submit |
| Submit for review | ✅ | ✅ | ✅ |
| Approve | ❌ | ✅ | ✅ if has approver perm |
| Lock | ❌ | ✅ | ✅ if has approver perm |
| Export | ✅ (draft warning) | ✅ | ✅ |
| View locked payslips | ✅ | ✅ | ✅ |

Segregation: if org enables Ent-tier duty separation, same user cannot approve a payrun they last edited (configurable; default allow for SME).

### Organization (`/hr/organization/...`)

- **Pay groups** — name, cycle (`monthly` / `weekly` / `biweekly`), cutoff day, default for branch  
- **Pay components** — view seeded catalog; add custom earning/deduction/employer lines; edit flags (not system statutory codes)  
- **Branch payroll** — HRDF registered (yes/no), HRDF rate (default 1%), LINDUNG enabled  

### Employee compensation (`/hr/employees/[id]` — extend profile)

- **Pay basis** — monthly | hourly | daily  
- **Basic salary** / hourly rate / daily rate  
- **Recurring allowances** — assign seeded allowance components with fixed monthly amounts  
- **Statutory** — EPF/SOCSO/tax numbers; EPF employee/employer rates (defaults from KWSP rules); voluntary EPF extra %; EIS eligible; SOCSO category override (optional, else auto)  
- **Tax profile (TP1)** — marital status, spouse working, child counts, disabled child, zakat annual declaration, other reliefs  
- **TP3** — previous employer YTD (for mid-year joiners)  
- **Dependents** — linked from existing `employee_dependents` for child relief counts  

### Employee self-service (`/employee/payslips`)

- List locked payslips (unchanged route)  
- Payslip detail — component breakdown, statutory lines, YTD snippet  
- Email delivery on pay date (scheduled job)  

### Director (`/director/payroll` — new read-only routes)

- Payrun list + detail + individual payslip drill-down  
- No edit, approve, lock, or export (optional: export summary CSV in v2)  

### Integrations (auto-feed into draft generation)

| Source | Feed |
|--------|------|
| **Employee profile** | Basic/recurring allowances, rates, statutory settings |
| **OT module** | Approved OT in earning period → `OT_PAY` component (EA formula) |
| **Claims module** | Approved claims in period → taxable or reimbursement component per category |
| **Leave module** | Unpaid leave days in period → `DED_UNPAID_LEAVE` (working-day rate) |
| **Attendance** | Hourly/daily employees: approved hours/days in period |
| **Employment dates** | Join/terminate mid-period → prorate basic (working days) |

---

## 4. Non-goals (v1)

- Payroll for non-Malaysian tax jurisdictions  
- Multi-currency payroll  
- Split payroll across multiple legal entities in one payrun  
- Real-time sync with KWSP/PERKESO/LHDN portals (file export only)  
- Auto-submit statutory filings to government portals  
- Payroll.my API integration (no account)  
- Legacy PHP payrun import  
- `payroll_processor` / `payroll_approver` as separate UI personas beyond permissions  
- Payslip password-protected PDF attachment (plain PDF/email link v1)  
- Loan/advance repayment schedules (manual deduction component only)  
- Commission plans / tiered incentive engines  

### v2 candidates

- Ent-tier strict duty segregation enforcement  
- Payroll anomaly ML checks (Pro tier)  
- Auto bank file SFTP upload  
- Commission engine  
- i-Akaun / ASSIST API integration if vendors expose APIs  
- Payslip WhatsApp delivery  

---

## 5. Current state

| Area | Status |
|------|--------|
| DB tables | ✅ `pay_groups`, `payroll_components`, `payroll_payruns`, `payroll_payrun_items`, `payroll_item_components`, `statutory_rule_versions` |
| Domain calculators | 🟡 EPF, EIS, simplified PCB in `packages/domain/src/payroll/malaysia-statutory.ts` |
| SOCSO calculator | ❌ Not implemented |
| Reference data | ✅ `malaysia-payroll-official-2026.json` (+ supplement) at repo root |
| Runtime payrun | 🟡 Basic salary → EPF 11%/13% + EIS only; SOCSO/PCB = 0 |
| UI | 🟡 List payruns, create draft, lock; no edit/review/approve |
| Payslips | ✅ Employee list/detail for locked payruns |
| Pay components UI | ❌ |
| OT/claims/leave feeds | ❌ |
| Bank/statutory exports | ❌ |
| EA / CP8D | ❌ |
| YTD / TP1 / TP3 | ❌ Schema partial (`employee_dependents` exists) |
| Golden tests | 🟡 EPF, EIS, PCB scaffold; SOCSO placeholder |

---

## 6. Statutory engine

### 6.1 Rule pack hierarchy

```text
malaysia-payroll-official-2026.json          (source of truth reference)
        ↓
statutory_rule_versions.payload (JSONB)      (activated per effective_from)
        ↓
packages/domain/src/payroll/                 (pure functions consuming rule DTOs)
        ↓
apps/web payrun pipeline                     (orchestration + persistence)
```

**Rule sets (separate versions, effective-dated):**

| `rule_set` | Contents |
|------------|----------|
| `kwsp_third_schedule` | Age bands, citizen/PR/foreign rates, RM50 wage rounding, contribution caps |
| `perkeso_socso` | Cat 1 & Cat 2 wage bands → employee/employer RM |
| `perkeso_eis` | EIS bands (0.2% / 0.2%) |
| `perkeso_lindung` | LINDUNG 24 Jam rates (optional toggle) |
| `lhdn_mtd_2026` | Resident bands, reliefs, rebates, 5-sen PCB rounding |
| `hrdcorp_levy` | 1% employer levy rules |

**Activation flow (hybrid):**

1. App release includes new rule pack rows (inactive / future `effective_from`)  
2. HR Admin → Payroll Settings → **Statutory rules** — preview diff, activate on effective date  
3. Payrun uses rules where `earning_period_end` falls within `[effective_from, effective_to]`  

### 6.2 Mandatory vs optional statutory

| Statutory | Config | Default |
|-----------|--------|---------|
| EPF | Mandatory | On |
| SOCSO | Mandatory | On (auto category) |
| EIS | Mandatory | On (if eligible) |
| PCB/MTD | Mandatory | On |
| HRDF | Optional | Off; **per branch** when registered |
| LINDUNG 24 Jam | Optional | Off; org/branch toggle |
| Voluntary EPF (employee extra %) | Optional | Per employee |

### 6.3 EPF (KWSP)

- Load rates from `kwsp_third_schedule` rule pack by employee age, nationality, PR status  
- **Foreign workers:** latest KWSP rules (employer/employee rates per effective date)  
- Contributable wage: sum of components with `is_epf = true`; apply **RM50 ceiling** when rule pack specifies  
- Employee rate: default 11% + optional voluntary extra %  
- Employer rate: from schedule (12%/13% by wage threshold for citizens; foreign worker rules per pack)  
- Contribution amount: **ceil to next ringgit** (employee and employer separately)  

### 6.4 SOCSO (PERKESO)

- **Auto-detect category:**
  - **Category 1** — employee under 60, eligible employment  
  - **Category 2** — employee 60 and above  
  - Employment injury scheme where applicable (per rule pack)  
- Wage base: sum of components with `is_socso = true`, capped at schedule maximum (RM6,000 for EIS alignment)  
- Lookup **fixed RM** employee/employer amounts from wage band table (not percentage)  
- Admin override on employee profile when edge case requires manual category  

### 6.5 EIS

- 0.2% employee + 0.2% employer on PERKESO assumed wage from SOCSO band  
- Respect `eis_eligible` flag (foreign workers per PERKESO eligibility rules)  

### 6.6 PCB / MTD (LHDN Computerised Method)

**Reliefs captured via TP1 / employee tax profile:**

| Relief | Source |
|--------|--------|
| Personal (RM9,000) | Auto |
| Spouse | TP1 — non-working / disabled spouse rules |
| Children | TP1 + `employee_dependents` count |
| EPF + life insurance | Capped RM4,000/year from projected EPF |
| SOCSO + EIS | Deductible per LHDN rules |
| Zakat | TP1 annual zakat → **rebate against tax** (reduces PCB) |
| Other TP1 items | Configurable fields matching LHDN form |

**YTD inputs per employee per calendar year:**

- `ytd_gross`, `ytd_epf`, `ytd_socso`, `ytd_eis`, `ytd_pcb`, `ytd_zakat`  
- TP3 opening balances for new joiners mid-year  

**Calculation:**

1. Project annual gross from YTD + current period + remaining periods in year  
2. Apply reliefs and rebates (including zakat rebate)  
3. Compute annual tax on chargeable income (progressive resident bands)  
4. Derive current period PCB = `(annual_tax - ytd_pcb) / remaining_periods`  
5. Round PCB: **ceil to next 5 sen**  

### 6.7 HRDF

- When `branches.hrdf_enabled = true`: employer levy = `hrdf_rate × HRDF wage base`  
- HRDF wage base: sum of components with `is_hrdf = true` (default: same as SOCSO base)  
- Default rate: 1%  
- Appears as employer-only component `HRDF_ER`; included in branch statutory export  

### 6.8 LINDUNG 24 Jam

- Optional; when enabled, rates from `perkeso_lindung` rule pack  
- Employer/employee amounts per PERKESO schedule  
- Separate line items on payslip; included in SOCSO branch export bundle where applicable  

### 6.9 Rounding rules (Malaysian standard)

| Step | Rule |
|------|------|
| Internal arithmetic | `decimal.js`; never JS `number` for money |
| EPF contributions | Ceil to **next ringgit** |
| SOCSO | Fixed RM from schedule (no float math) |
| EIS | 2 dp on assumed wage × 0.2% |
| PCB | Ceil to **next 5 sen** |
| Net pay | 2 dp (sen) |
| Display | RM format, 2 dp |

### 6.10 Zakat (Malaysian practice)

Most Malaysian employers handle zakat as follows:

1. **Primary (required):** Employee declares annual zakat on **TP1**. Paid zakat (or monthly instalment) is treated as a **tax rebate** in the LHDN Computerised MTD calculation — **reduces PCB**, not gross pay.  
2. **Secondary (optional):** If employee opts for **salary deduction** for zakat payment to state religious council, record as post-tax deduction component `DED_ZAKAT` on payslip. This is separate from the PCB rebate and reduces net pay after PCB.  

**v1 implements both:**

- TP1 `zakat_annual` → PCB rebate in domain engine  
- Optional recurring `DED_ZAKAT` component (monthly instalment = annual / 12 or HR-entered)  

### 6.11 Weekly / bi-weekly PCB

Non-monthly employees use the **same LHDN Computerised Method** with frequency-aware annualization:

| Cycle | Periods per year (default) | Projection |
|-------|---------------------------|------------|
| Monthly | 12 | Standard MTD |
| Weekly | 52 | `period_gross × 52` for annual projection when no YTD |
| Bi-weekly | 26 | `period_gross × 26` for annual projection when no YTD |

**Remaining periods** for PCB formula:

- Monthly: `13 - month` (existing scaffold)  
- Weekly: weeks remaining in calendar year including current  
- Bi-weekly: pay periods remaining in calendar year including current  

YTD accumulates per **calendar year** regardless of pay frequency. When YTD exists, projection uses actual YTD + (current period × remaining periods) rather than naive annualization.

---

## 7. Pay component catalog (seeded defaults)

Seeded on org bootstrap (`payroll_components`). System codes are immutable; HR may add custom codes.

### 7.1 Earnings

| Code | Name | EPF | SOCSO | EIS | PCB | HRDF | Source |
|------|------|-----|-------|-----|-----|------|--------|
| `BASIC` | Basic salary | ✅ | ✅ | ✅ | ✅ | ✅ | Employee profile |
| `ALLOW_TRANSPORT` | Transport allowance | ✅ | ✅ | ✅ | ✅ | ✅ | Recurring / manual |
| `ALLOW_PHONE` | Phone / communication | ✅ | ✅ | ✅ | ✅ | ✅ | Recurring / manual |
| `ALLOW_MEAL` | Meal allowance | ❌* | ✅ | ✅ | ❌* | ✅ | Recurring / manual |
| `ALLOW_ATTEND` | Attendance incentive | ✅ | ✅ | ✅ | ✅ | ✅ | Recurring / manual |
| `ALLOW_SHIFT` | Shift allowance | ✅ | ✅ | ✅ | ✅ | ✅ | Recurring / manual |
| `ALLOW_HOUSING` | Housing allowance | ✅ | ✅ | ✅ | ✅ | ✅ | Recurring / manual |
| `ALLOW_PETROL` | Petrol / car allowance | ✅ | ✅ | ✅ | ✅ | ✅ | Recurring / manual |
| `OT_PAY` | Overtime pay | ✅ | ✅ | ✅ | ✅ | ✅ | OT module |
| `CLAIM_TAXABLE` | Taxable claim | ✅ | ✅ | ✅ | ✅ | ✅ | Claims (taxable categories) |
| `CLAIM_REIMB` | Reimbursement | ❌ | ❌ | ❌ | ❌ | ❌ | Claims (reimbursement categories) |
| `BONUS` | Bonus / ex-gratia | ✅ | ✅ | ✅ | ✅ | ✅ | Manual / adjustment payrun |
| `BACKPAY` | Salary backpay | ✅ | ✅ | ✅ | ✅ | ✅ | Retro component |

\* Meal allowance: commonly partially exempt; org may override flags in component settings. Default follows common SME practice (many treat transport/meal under specific exemption policies — HR can toggle per org).

### 7.2 Deductions

| Code | Name | Notes |
|------|------|-------|
| `DED_UNPAID_LEAVE` | Unpaid leave | Auto from leave module |
| `DED_ZAKAT` | Zakat (salary deduction) | Optional post-tax |
| `DED_PCB` | PCB / MTD | Auto statutory |
| `DED_EPF` | EPF employee | Auto statutory |
| `DED_SOCSO` | SOCSO employee | Auto statutory |
| `DED_EIS` | EIS employee | Auto statutory |
| `DED_OTHER` | Other deduction | Manual (loans, advances) |

### 7.3 Employer contributions (informational on payslip)

| Code | Name |
|------|------|
| `ER_EPF` | EPF employer |
| `ER_SOCSO` | SOCSO employer |
| `ER_EIS` | EIS employer |
| `ER_HRDF` | HRDF levy |
| `ER_LINDUNG` | LINDUNG 24 Jam employer |

### 7.4 Claims category mapping

Seed `claim_categories` with `payroll_treatment`:

| Treatment | Component |
|-----------|-----------|
| `taxable` | `CLAIM_TAXABLE` |
| `reimbursement` | `CLAIM_REIMB` |
| `exclude` | Not included in payrun |

HR can override per category in Claims settings.

---

## 8. Payrun pipeline

```text
1. Select scope (pay group | org-wide) + earning period + pay date
2. Resolve employee set (active in period, matching branch/pay group)
3. For each employee:
   a. Base pay (monthly prorated | hourly × hours | daily × days)
   b. Add recurring allowances
   c. Pull approved OT, claims, unpaid leave
   d. Build component lines (payroll_item_components)
   e. Sum statutory bases per flag
   f. Compute EPF → SOCSO → EIS → PCB (with YTD + TP1/TP3)
   g. Optional HRDF, LINDUNG (employer)
   h. net = gross - employee deductions
   i. Flag if net < 0 or missing statutory IDs
4. Persist payrun items (draft)
5. HR edits → submit → approve → lock
6. On lock: freeze YTD accumulators; schedule payslip emails for pay_date
```

### 8.1 Payrun types

| Type | Use |
|------|-----|
| `regular` | Normal cycle payrun |
| `adjustment` | Bonus, backpay, correction — separate from regular; can target subset of employees |

### 8.2 OT calculation (Employment Act)

```
Hourly rate = monthly_basic / 26        (configurable divisor per org, default 26)
OT pay = hourly_rate × multiplier × approved_hours

Multipliers:
  Normal day OT     → 1.5×
  Rest day          → 2.0× (or 1.0× first 8h + 2.0× thereafter per EA — rule pack documents full table)
  Public holiday    → 3.0×
```

Store approved hours and multiplier per OT request; payrun sums into `OT_PAY`.

### 8.3 Unpaid leave deduction

```
daily_rate = monthly_basic / working_days_in_period
deduction = daily_rate × unpaid_leave_days
```

`working_days_in_period` = weekdays in earning period minus branch public holidays (reuse leave calendar logic).

### 8.4 Join / terminate proration

```
prorated_basic = monthly_basic × (working_days_employed_in_period / working_days_in_period)
```

Applied when `join_date` or `termination_date` falls inside earning period.

### 8.5 Negative net pay

- Set `payrun_items.requires_resolution = true` and `resolution_note`  
- Block **approve** until all flags cleared or HR adjusts deductions  
- HR may reduce voluntary deductions or spread via manual `DED_OTHER` adjustment  

---

## 9. Data model changes

### 9.1 Alter — `branches`

```sql
alter table public.branches
  add column if not exists hrdf_enabled boolean not null default false,
  add column if not exists hrdf_registration_number text,
  add column if not exists hrdf_rate numeric(5,4) not null default 0.01,
  add column if not exists lindung_enabled boolean not null default false,
  add column if not exists default_pay_group_id uuid references public.pay_groups(id);
```

### 9.2 Alter — `pay_groups`

```sql
alter table public.pay_groups
  add column if not exists branch_id uuid references public.branches(id),
  add column if not exists is_default boolean not null default false,
  add column if not exists pay_day_offset smallint;  -- informational; pay date set per payrun
```

### 9.3 Alter — `payroll_payruns`

```sql
alter table public.payroll_payruns
  add column if not exists payrun_type text not null default 'regular'
    check (payrun_type in ('regular', 'adjustment')),
  add column if not exists scope text not null default 'pay_group'
    check (scope in ('pay_group', 'org_wide')),
  add column if not exists pay_date date,
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists period_week smallint,  -- for weekly/biweekly uniqueness
  add column if not exists notes text;

-- Replace uniqueness: (org, pay_group, year, month) insufficient for weekly
drop index if exists payroll_payruns_org_paygroup_period_key;
create unique index payroll_payruns_period_key
  on public.payroll_payruns (
    organization_id,
    coalesce(pay_group_id, '00000000-0000-0000-0000-000000000000'),
    period_year,
    coalesce(period_month, 0),
    coalesce(period_week, 0),
    payrun_type
  );
```

### 9.4 Alter — `payroll_payrun_items`

```sql
alter table public.payroll_payrun_items
  add column if not exists branch_id uuid references public.branches(id),
  add column if not exists hrdf_employer numeric(14,2) not null default 0,
  add column if not exists lindung_employee numeric(14,2) not null default 0,
  add column if not exists lindung_employer numeric(14,2) not null default 0,
  add column if not exists requires_resolution boolean not null default false,
  add column if not exists resolution_note text,
  add column if not exists epf_wage_base numeric(14,2) not null default 0,
  add column if not exists socso_wage_base numeric(14,2) not null default 0,
  add column if not exists pcb_wage_base numeric(14,2) not null default 0;
```

### 9.5 Alter — `payroll_components`

```sql
alter table public.payroll_components
  add column if not exists is_hrdf boolean not null default false,
  add column if not exists is_system boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order smallint not null default 0;
```

### 9.6 New — `employee_compensation`

```sql
create table public.employee_compensation (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pay_basis text not null default 'monthly' check (pay_basis in ('monthly', 'hourly', 'daily')),
  basic_salary numeric(14,2) not null default 0,
  hourly_rate numeric(14,4),
  daily_rate numeric(14,2),
  voluntary_epf_extra_rate numeric(5,2) not null default 0,
  socso_category_override text check (socso_category_override in ('cat1', 'cat2')),
  updated_at timestamptz not null default now()
);
```

Migrate `employee_profiles.basic_salary` → `employee_compensation` (keep column deprecated/synced during transition).

### 9.7 New — `employee_recurring_allowances`

```sql
create table public.employee_recurring_allowances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  component_id uuid not null references public.payroll_components(id),
  amount numeric(14,2) not null,
  effective_from date not null,
  effective_to date,
  unique (employee_id, component_id, effective_from)
);
```

### 9.8 New — `employee_tax_profiles`

```sql
create table public.employee_tax_profiles (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  marital_status text,
  spouse_working boolean,
  zakat_annual numeric(14,2) not null default 0,
  tp1_payload jsonb not null default '{}',
  tp3_payload jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
```

### 9.9 New — `payroll_ytd_balances`

```sql
create table public.payroll_ytd_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  calendar_year smallint not null,
  ytd_gross numeric(14,2) not null default 0,
  ytd_epf_employee numeric(14,2) not null default 0,
  ytd_socso_employee numeric(14,2) not null default 0,
  ytd_eis_employee numeric(14,2) not null default 0,
  ytd_pcb numeric(14,2) not null default 0,
  ytd_zakat numeric(14,2) not null default 0,
  opening_balance boolean not null default false,
  unique (employee_id, calendar_year)
);
```

Updated on payrun **lock** (not draft). `opening_balance = true` when HR enters TP3/manual opening YTD at onboarding.

### 9.10 New — `payroll_exports`

```sql
create table public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payrun_id uuid not null references public.payroll_payruns(id),
  branch_id uuid references public.branches(id),
  export_type text not null,  -- bank_maybank | bank_cimb | bank_csv | epf | socso | pcb | hrdf | ea | cp8d
  file_key text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id)
);
```

Files stored in R2 private bucket; signed download URL on request. Audit log: `payroll.exported`.

### 9.11 RLS

Org-scoped policies on all new tables. Director read-only via server actions (no direct client Supabase). Locked payrun immutability trigger extended to `payroll_item_components`.

---

## 10. Exports

### 10.1 Bank salary files

| Format | Code | Notes |
|--------|------|-------|
| Generic CSV | `bank_csv` | Name, IC, bank, account, net pay, reference |
| Maybank bulk | `bank_maybank` | Column layout per Maybank M2E spec |
| CIMB bulk | `bank_cimb` | Column layout per CIMB BizChannel spec |

- One file per payrun per branch (employees grouped by `branch_id`)  
- Only **locked** payruns (or draft with explicit warning)  

### 10.2 Statutory files (per branch)

| Export | Code | Grouping |
|--------|------|----------|
| EPF i-Akaun text | `epf` | Per branch |
| PERKESO ASSIST / SOCSO | `socso` | Per branch; includes EIS + LINDUNG if enabled |
| LHDN e-Data PCB / CP39 | `pcb` | Per branch |
| HRD Corp levy | `hrdf` | Per branch where `hrdf_enabled` |

Org-wide payrun still generates **separate files per branch** — never merged.

### 10.3 Year-end

| Export | Code | When |
|--------|------|------|
| Borang EA PDF | `ea` | Per employee per calendar year |
| CP8D data | `cp8d` | Org/branch annual submission file |

---

## 11. Application layer

### 11.1 Packages

| Package | Contents |
|---------|----------|
| `packages/domain/src/payroll/` | `malaysia-statutory.ts` (extend), `socso.ts`, `payrun-pipeline.ts`, `ot.ts`, `proration.ts`, `ytd.ts`, rule DTOs |
| `packages/validation/src/payroll.ts` | Payrun create, line edit, approve, export schemas |
| `packages/testkit/` | Extended `payroll-golden-cases.json` from official examples |

### 11.2 Web lib (`apps/web/src/lib/payroll/`)

| Module | Responsibility |
|--------|----------------|
| `queries.ts` | List payruns, payrun detail, components, YTD |
| `generate.ts` | Draft payrun pipeline orchestration |
| `edit.ts` | Line/component mutations (draft only) |
| `workflow.ts` | Submit, approve, lock + status log |
| `exports/bank.ts` | Bank file generators |
| `exports/statutory.ts` | EPF, SOCSO, PCB, HRDF |
| `exports/year-end.ts` | EA PDF, CP8D |
| `feeds/ot.ts` | Approved OT → components |
| `feeds/claims.ts` | Approved claims → components |
| `feeds/leave.ts` | Unpaid leave → deduction |
| `feeds/attendance.ts` | Hourly/daily hours |
| `rules.ts` | Load active `statutory_rule_versions` |
| `seed.ts` | Org bootstrap components + claim category mapping |

### 11.3 Routes

| Route | Access |
|-------|--------|
| `/hr/payroll` | HR — list |
| `/hr/payroll/new` | HR — create payrun wizard |
| `/hr/payroll/[payrunId]` | HR — detail, edit, workflow, exports |
| `/hr/payroll/settings/components` | HR — component catalog |
| `/hr/payroll/settings/pay-groups` | HR — pay groups |
| `/hr/payroll/settings/statutory` | HR — rule pack activation |
| `/hr/payroll/year-end` | HR — EA / CP8D |
| `/director/payroll` | Director — read-only list |
| `/director/payroll/[payrunId]` | Director — read-only detail |
| `/employee/payslips` | Employee — unchanged |
| `/employee/payslips/[itemId]` | Employee — enhanced breakdown |

### 11.4 Scheduled jobs

| Job | Schedule | Action |
|-----|----------|--------|
| `payroll.payslip_email` | Daily 08:00 MYT | Email payslips where `pay_date = today` and payrun `locked` |
| `payroll.rule_activation` | Daily | Activate rule packs where `effective_from = today` (if admin pre-approved) |

### 11.5 Audit events

`payroll.payrun.created`, `payroll.payrun.submitted`, `payroll.payrun.approved`, `payroll.payrun.locked`, `payroll.line.edited`, `payroll.exported`, `payroll.ytd.opening_entered`, `payroll.rule.activated`.

---

## 12. Accuracy & testing strategy

### 12.1 Golden tests (automated — required for merge)

| Case source | Examples |
|-------------|----------|
| KWSP official examples | RM50 wage rounding, age-based rates, foreign worker |
| PERKESO schedule | Cat 1 band lookup at RM4,000, RM6,000 ceiling |
| LHDN MTD | Published computerised examples for monthly, mid-year joiner with TP3 |
| Edge cases | Zero salary, max SOCSO wage, voluntary EPF, zakat rebate, negative PCB → 0 |

Location: `packages/testkit/src/fixtures/payroll-golden-cases.json` + `tests/migration/payroll-golden.test.ts`

### 12.2 Cross-validation matrix (manual QA)

Because **no payroll.my account** and **no legacy payruns** are available:

| Source | Method |
|--------|--------|
| KWSP i-Akaun calculator / published tables | Spot-check 10 EPF cases |
| PERKESO ASSIST rate tables | Spot-check 10 SOCSO cases |
| LHDN MTD specification PDF examples | Spot-check 10 PCB cases |
| payroll.my public blog/examples (if any) | Reference only |
| Kakitangan / Payboy trial calculators | Spot-check 5 composite cases if trial accessible |

Maintain `docs/payroll-accuracy-matrix.md` (to be created during implementation) with columns: employee profile, inputs, expected EPF/SOCSO/EIS/PCB/net, source citation, HRMS actual, variance.

**Acceptance:** variance **RM0.00** on statutory lines for all golden cases; net pay variance **≤ RM0.01** only if source explicitly documents different rounding order (document exception).

### 12.3 Parallel run (recommended before go-live)

1. HR runs parallel payrun in HRMS alongside existing manual/excel process for 1–2 cycles  
2. Compare totals per employee; investigate any variance > RM0.01  
3. Sign-off checklist stored per payrun (`payrun.notes` + audit)  

### 12.4 Fresh start cutover

- No legacy payrun import  
- HR enters **opening YTD** per employee via TP3 screen for mid-year go-live  
- First locked payrun updates `payroll_ytd_balances` from opening + period amounts  

---

## 13. Internal build order (big-bang release, sequenced development)

Even though product ships as one module, development proceeds in dependency order:

| Phase | Deliverable | Gate |
|-------|-------------|------|
| **A** | Rule packs seeded; SOCSO calculator; full EPF/PCB; golden tests pass | Statutory unit tests green |
| **B** | Schema migration; component seed; employee compensation/tax profile UI | Migration applied |
| **C** | Payrun pipeline on basic + allowances only | Draft payrun matches manual spreadsheet |
| **D** | OT, claims, leave, proration feeds | Integration tests |
| **E** | Workflow (submit/approve/lock); YTD accumulators | Status transitions + immutability |
| **F** | Bank + statutory exports per branch | File format validation |
| **G** | EA / CP8D year-end | PDF sample review |
| **H** | Payslip email job; director read-only | E2E smoke |
| **I** | Accuracy matrix sign-off | HR acceptance |

---

## 14. UI notes

- Payrun detail: editable grid for draft (inline amount edit per component)  
- Validation banner at top: unresolved negative net, missing EPF/SOCSO/tax numbers  
- Statutory summary cards: EPF / SOCSO / EIS / PCB / HRDF totals per payrun  
- Export drawer: select branch → select format → download  
- Employee tax profile: TP1 form layout (sectioned) + TP3 upload/entry  
- Payslip: match Pencil design when available; show employer contributions section  
- Director view: same layout, all inputs disabled  

---

## 15. Migration strategy

1. Apply schema migrations (§9)  
2. Seed `payroll_components` for all existing orgs  
3. Backfill `employee_compensation` from `employee_profiles.basic_salary`  
4. Create default pay group per branch (`cycle = monthly`, `cutoff_day` from `branches.payroll_cutoff_day`)  
5. Seed `statutory_rule_versions` from `malaysia-payroll-official-2026.json`  
6. Map claim categories → `payroll_treatment`  
7. Deprecate direct `basic_salary` edits on profile (redirect to compensation tab)  

---

## 16. Documentation updates

- `docs/features.md` §8 — mark implemented items ✅  
- Create `docs/payroll-accuracy-matrix.md` during implementation  
- `docs/developer-brief.md` — link to this spec; note `PAYROLL_ACCURACY.md` superseded by accuracy matrix  
- Reports hub — no change (statutory stays in Payroll)  

---

## 17. Exit criteria

- [x] Statutory engine passes all golden tests (EPF, SOCSO, EIS, PCB, HRDF, zakat rebate)
- [x] Draft payrun generates for monthly, weekly, bi-weekly pay groups
- [x] OT, claims, unpaid leave, join/leave proration feed correctly
- [x] Workflow: draft → edit → submit → approve → lock with audit log
- [x] Locked payrun immutable (DB trigger + integration test)
- [x] YTD updates on lock; TP3 opening balances supported
- [x] Bank export (CSV + at least 2 bank formats) per branch
- [x] Statutory export (EPF, SOCSO, PCB, HRDF) per branch
- [x] EA PDF + CP8D export for calendar year
- [x] Employee payslip shows full component + statutory breakdown
- [x] Payslip email job fires on pay date
- [x] Director read-only payroll routes
- [x] Mandatory statutory cannot be disabled; optional HRDF/LINDUNG per branch
- [x] Accuracy matrix completed with official source citations; zero variance on golden set
- [x] `pnpm typecheck` + payroll integration tests + smoke test paths pass

---

## 18. Resolved items

1. **Zakat:** TP1 rebate reduces PCB; optional `DED_ZAKAT` salary deduction for payslip.  
2. **Allowances:** Seeded Malaysian SME defaults (§7).  
3. **Weekly/bi-weekly PCB:** LHDN annualization with frequency-aware remaining periods (§6.6).  
4. **Statutory files:** Per branch, never merged.  
5. **payroll.my:** Not available; use official schedules + other tools for spot-check.  
6. **Legacy payruns:** Not available; fresh start with manual YTD opening.  
7. **Reports module:** Statutory exports remain in Payroll, not Reports hub.  

---

*Implementation plan: [2026-07-27-payroll-module.md](../plans/2026-07-27-payroll-module.md)*
