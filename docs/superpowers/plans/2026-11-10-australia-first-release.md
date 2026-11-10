# Australia First Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Australian company can store people, run leave and time, install the employee phone app, and export a Xero/MYOB pay file, while a Malaysian company still calculates EPF, SOCSO, EIS, and PCB.

**Architecture:** Add `country` and `currency` on the organization. Malaysia stays the default and keeps the current statutory pipeline. Australia hides Malaysian fields, labels money as AUD, stores Australian employee identifiers, shows leave in hours, and exports hours from attendance, approved leave, and approved overtime. The pay file does not calculate tax, super, or awards.

**Tech Stack:** Next.js app in `apps/web`, domain payroll in `packages/domain`, Zod in `packages/validation`, Supabase SQL migrations, Vitest.

## Global Constraints

- Existing Malaysian organizations stay `country = 'MY'` and `currency = 'MYR'`.
- An Australian organization never shows EPF, SOCSO, EIS, PCB, HRDF, EA, or a Malaysian state list.
- BukuHR does not calculate award rates, PAYG, superannuation guarantee, or Single Touch Payroll.
- The legal payslip stays in Xero or MYOB.
- Leave is still stored in days. Australia displays and accepts hours using `standard_day_hours` (default 7.6). Malaysia keeps day entry.
- The phone app is a PWA. No App Store or Play Store build.
- Do not build contract signature, pre-day-one onboarding, a public jobs page, a learning system, recognition, or a benefits catalogue in this release.

This parent plan splits into five implementation plans. Write the detailed test-first plan for a part only when that part starts. Each part is releasable on its own.

---

## Already enough

These client rows need no new feature. Confirm them in the Australian demo after Part 1, because labels and currency must be Australian first.

| Client row | Where it already lives |
|---|---|
| Secure document storage | `/hr/documents`, `/employee/documents` |
| Policy acknowledgement | `/hr/policies`, `/employee/policies` |
| Workflows and approvals | `/hr/organization/approval-workflows`, `/manager/approvals` |
| Reporting and analytics | `/hr/reports`, `/hr/analytics` |
| Applicant tracking and candidates | `/hr/recruitment` |
| Offboarding checklists | `/hr/checklists`, employee checklist panel |
| Shift rostering | `/hr/organization/rosters`, `/employee/schedule` |
| Clock in, clock out, timesheets | `/employee/attendance`, `/employee/timesheet` |
| Performance reviews and goals | `/hr/performance`, `/employee/performance` |
| Engagement pulse | `/hr/pulse`, `/employee/pulse` |

Weekly and fortnightly pay groups already exist on `createPayGroupSchema` (`monthly`, `weekly`, `biweekly`). No new cycle type.

---

### Part 1: Australian company

**Files:**
- Create: `supabase/migrations/20261110120000_organization_country.sql`
- Modify: `packages/validation/src/organization.ts`
- Modify: `apps/web/src/lib/platform/provision-tenant.ts`
- Modify: `apps/web/src/lib/datetime/org-timezone.ts`
- Modify: `packages/domain/src/payroll/payrun-pipeline.ts`
- Test: `packages/domain/src/payroll/payrun-pipeline.test.ts`

**Produces:**
- `organizations.country` text not null default `'MY'`
- `organizations.currency` text not null default `'MYR'`
- `organizations.abn` text null
- `organizations.standard_day_hours` numeric not null default `8`
- `isMalaysia(country: string): boolean`

- [ ] **Step 1: Add the organization columns**

```sql
alter table public.organizations
  add column if not exists country text not null default 'MY',
  add column if not exists currency text not null default 'MYR',
  add column if not exists abn text,
  add column if not exists standard_day_hours numeric(4,2) not null default 8;

alter table public.organizations
  drop constraint if exists organizations_country_check;

alter table public.organizations
  add constraint organizations_country_check check (country in ('MY', 'AU'));

alter table public.organizations
  drop constraint if exists organizations_currency_check;

alter table public.organizations
  add constraint organizations_currency_check check (currency in ('MYR', 'AUD'));
```

- [ ] **Step 2: Setting an Australian company**

Owner settings save `country = 'AU'`, `currency = 'AUD'`, an 11-digit ABN, an Australian state on the branch, and `standard_day_hours = 7.6`. Timezone comes from the state: NSW and ACT `Australia/Sydney`, VIC `Australia/Melbourne`, QLD `Australia/Brisbane`, SA `Australia/Adelaide`, WA `Australia/Perth`, TAS `Australia/Hobart`, NT `Australia/Darwin`.

Branch state validation in `packages/validation/src/organization.ts` accepts Malaysian states only when the organization country is MY, and `NSW`, `VIC`, `QLD`, `SA`, `WA`, `TAS`, `NT`, `ACT` when the country is AU.

Hide HRDF, EPF employer number, SOCSO employer code, and Lindung fields when `country = 'AU'`.

- [ ] **Step 3: Stop Malaysian statutory on an Australian pay run**

`computePayrun` takes `country`. When `country` is `AU`, employee EPF, employer EPF, SOCSO, EIS, PCB, and HRDF are `0`. Earnings and deductions entered as pay components still apply. The existing Malaysia test stays green.

```ts
it("skips Malaysian statutory when the organization country is AU", () => {
  const result = computePayrun({ ...basicSalaryInput, country: "AU" });
  expect(result.epfEmployee.toNumber()).toBe(0);
  expect(result.pcb.toNumber()).toBe(0);
});
```

- [ ] **Step 4: Money label**

Add `formatMoney(amount: number, currency: "MYR" | "AUD")` in `apps/web/src/lib/money.ts`. MYR renders `RM 10.00`. AUD renders `A$10.00`. Use it on the employee salary panel, pay run lines, payslip, and the reports hub. Leave claim screens on this helper in the same change so an Australian company does not see `RM`.

**Done when:** A new Australian company shows AUD, an ABN, and an Australian state, and a pay run for that company has no EPF or PCB. A Malaysian company is unchanged.

---

### Part 2: Australian employee record

**Files:**
- Create: `supabase/migrations/20261110130000_au_employee_tax_profile.sql`
- Modify: `packages/validation/src/employee.ts`
- Modify: `apps/web/src/lib/employees/parse-profile-form.ts`
- Modify: `apps/web/src/lib/employees/create-employee.ts`
- Modify: `apps/web/src/lib/employees/update-employee.ts`
- Modify: `apps/web/src/components/hr/employees/edit-employee-form.tsx`
- Modify: `apps/web/src/components/hr/employees/employee-profile-view.tsx`
- Test: `tests/unit/au-employee-profile.test.ts`

**Produces:** columns on `employee_profiles`:

- `employment_basis` text null, check in `full_time`, `part_time`, `casual`
- `hourly_rate` numeric(12,2) null
- `bsb` text null
- `super_fund_name` text null
- `super_usi` text null
- `super_member_number` text null
- `tax_free_threshold` boolean not null default false
- `study_loan` boolean not null default false

`tax_number` remains the stored identifier. The Australian form labels it Tax File Number. The Malaysian form still labels it Tax no.

- [ ] **Step 1: Australian form fields**

When the organization country is AU, the employee form shows employment basis, hourly rate, TFN, BSB, account number, super fund, USI, member number, tax-free threshold, and study-loan flag. It hides IC number, EPF number, SOCSO number, EIS, and EPF rates.

When the organization country is MY, the form stays as it is today and hides the Australian fields.

- [ ] **Step 2: Validation**

```ts
const auEmployeeSchema = z.object({
  employmentBasis: z.enum(["full_time", "part_time", "casual"]),
  hourlyRate: z.coerce.number().positive(),
  taxNumber: z.string().regex(/^\d{8,9}$/),
  bsb: z.string().regex(/^\d{6}$/),
  bankAccountNumber: z.string().min(1).max(20),
  superFundName: z.string().min(1).max(200),
  superUsi: z.string().min(1).max(20),
  superMemberNumber: z.string().min(1).max(30),
  taxFreeThreshold: z.coerce.boolean(),
  studyLoan: z.coerce.boolean(),
});
```

Malaysian employee validation does not require these fields.

**Done when:** HR can save an Australian employee with those fields, reopen the profile, and see them. A Malaysian employee profile still shows EPF and SOCSO.

---

### Part 3: Installable employee app

**Files:**
- Create: `apps/web/src/app/manifest.ts`
- Create: `apps/web/public/icons/icon-192.png`
- Create: `apps/web/public/icons/icon-512.png`
- Create: `apps/web/src/components/pwa/install-prompt.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/public/sw.js`
- Test: `tests/unit/pwa-manifest.test.ts`

**Produces:** a web app manifest with `name: "BukuHR"`, `display: "standalone"`, `start_url: "/employee/dashboard"`, and icons at 192 and 512.

- [ ] **Step 1: Manifest and icons**

`apps/web/src/app/manifest.ts` returns that manifest. `layout.tsx` does not need a hand-written link if Next serves the manifest from this file. Confirm the response of `/manifest.webmanifest` includes `display: standalone`.

- [ ] **Step 2: Install prompt**

On the employee portal, show “Add BukuHR to your home screen” when `beforeinstallprompt` fires. On iPhone, where that event does not fire, show “Share, then Add to Home Screen”. Dismissing the prompt keeps it dismissed for that browser.

- [ ] **Step 3: Keep the service worker online-only**

`public/sw.js` already handles web push. Do not add an offline cache of pages or API calls. Clock-in and leave must keep using the live session.

**Done when:** Chrome on Android can install BukuHR and the icon opens the employee dashboard full screen. Push notifications still register. iPhone shows the Share instructions.

---

### Part 4: Australian leave hours and state holidays

**Files:**
- Create: `packages/domain/src/leave/hours.ts`
- Create: `packages/domain/src/leave/hours.test.ts`
- Create: `packages/domain/src/holidays/australia-2026.ts`
- Modify: leave apply UI under `apps/web/src/app/(employee)/employee/leave`
- Modify: holiday admin under `apps/web/src/app/(hr)/hr/organization/holidays`
- Test: `packages/domain/src/leave/hours.test.ts`

**Produces:**

```ts
export function daysToHours(days: number, standardDayHours: number): number;
export function hoursToDays(hours: number, standardDayHours: number): number;
```

`daysToHours(1, 7.6)` is `7.6`. `hoursToDays(15.2, 7.6)` is `2`. `standardDayHours` below or equal to `0` throws.

- [ ] **Step 1: Hours on the Australian leave screen**

The database column `leave_requests.days` and `leave_types.entitlement_days` stay in days. When the organization country is AU, the apply form accepts hours and saves `hours / standard_day_hours`. Balances render as hours. Malaysia still enters and displays days.

- [ ] **Step 2: State public holidays**

Add a button on holiday admin, visible only for an Australian company: “Load 2026 holidays for this state”. It inserts the national public holidays plus that state or territory’s holidays into `holidays` for the selected branch. Running it twice does not duplicate the same branch, date, and name.

The 2026 dates live in `packages/domain/src/holidays/australia-2026.ts` as data, not scraped at runtime. Include New Year’s Day, Australia Day, Good Friday, Easter Monday, Anzac Day, Christmas Day, and Boxing Day for every state, plus the state-specific days for NSW, VIC, QLD, SA, WA, TAS, NT, and ACT.

**Done when:** An Australian employee applies for 7.6 hours and the stored request is 1 day. The same screen in a Malaysian company still asks for days. Loading NSW 2026 holidays twice still yields one row per holiday.

---

### Part 5: Xero and MYOB pay file

**Files:**
- Create: `packages/domain/src/payroll/au-pay-file.ts`
- Create: `packages/domain/src/payroll/au-pay-file.test.ts`
- Create: `apps/web/src/lib/payroll/exports/au-pay-file.ts`
- Modify: `apps/web/src/app/(hr)/hr/payroll/page.tsx`
- Test: `packages/domain/src/payroll/au-pay-file.test.ts`

**Produces:**

```ts
export type AuPayFileLine = {
  employeeNumber: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  earningName: "Ordinary" | "Overtime" | "Annual leave" | "Personal leave" | "Allowance";
  hours: number;
  rate: number;
  amount: number;
};

export function buildAuPayFileCsv(lines: AuPayFileLine[]): string;
```

The header row is exactly:

```text
employee_number,employee_name,period_start,period_end,earning_name,hours,rate,amount
```

Amount is `round(hours * rate, 2)`. A blank employee number throws.

- [ ] **Step 1: Build the file from time, not from tax**

For an Australian organization, the payroll page offers “Download pay file” for a chosen period. Lines come from:

- Ordinary: closed attendance sessions in the period, hours between clock-in and clock-out, rate = `hourly_rate`
- Overtime: approved overtime requests in the period, hours and the request rate
- Annual leave and personal leave: approved leave in the period, hours = stored days × `standard_day_hours`, rate = `hourly_rate`
- Allowance: active allowance amounts in the period, hours blank, amount as stored

The button is hidden for a Malaysian organization. Bank, EPF, SOCSO, PCB, and HRDF exports stay as they are for Malaysia.

- [ ] **Step 2: Same file for both products**

One CSV is the Xero import and the MYOB import. Do not add a second format and do not call the Xero or MYOB APIs in this part.

**Done when:** A fixture with 7.6 ordinary hours at rate 30 produces a row `...,Ordinary,7.6,30,228.00`. A Malaysian payroll page does not show the button, and its EPF export still runs.

---

## Order

1. Part 1, Australian company. Nothing else is safe to demo until Malaysian statutory is hidden.
2. Part 2, Australian employee record. The pay file needs hourly rate, BSB, and super fields.
3. Part 4, leave hours and 2026 state holidays. The pay file’s leave hours use this conversion.
4. Part 5, pay file.
5. Part 3, PWA, can run beside Part 2. It does not depend on payroll.

## Self-review

- Client “do first” rows that need code are covered by Parts 1–5.
- Client “do first” rows that already exist are listed under “Already enough” and are not rebuilt.
- Award interpretation, PAYG, super calculation, Single Touch Payroll, native store apps, and the “do later” rows have no task.
- Malaysian statutory tests remain the regression gate for Part 1.
