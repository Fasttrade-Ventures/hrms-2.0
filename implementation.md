# Implementation Plan: Mileage Claims & Custom Employee OT Rates

## 1. Overview & Objectives
This document outlines the technical implementation for two key HR/Payroll features:
1. **Mileage Claims**: Support distance-based travel claims with default rate per km/mile, origin/destination inputs, and auto-calculated totals.
2. **Custom Employee OT Rates**: Support optional hourly OT rate override in employee compensation profiles, falling back to the standard formula (`monthly_salary / 26 * multiplier * hours`) if unset.
3. **Approval & Payroll Preview Flow Updates**: Ensure claim & OT calculation logic reflects in approvals, employee claim details, and payroll payrun generation / feeds.

---

## 2. Database Schema Changes (Supabase Migration)

### 2.1 `claim_types` Table Enhancements
Add mileage configuration columns to `claim_types`:
- `is_mileage` (`boolean NOT NULL DEFAULT false`): Indicates whether this claim type is calculated by mileage/distance.
- `rate_per_km` (`numeric(10,4) DEFAULT NULL`): Default reimbursement rate per km/mile (e.g. `0.8000`).

### 2.2 `claims` Table Enhancements
Add trip & mileage detail columns to `claims`:
- `is_mileage` (`boolean NOT NULL DEFAULT false`)
- `distance_km` (`numeric(10,2) DEFAULT NULL`): Distance in km or miles.
- `rate_per_km` (`numeric(10,4) DEFAULT NULL`): Rate locked in at the time of claim submission.
- `origin` (`text DEFAULT NULL`): Starting point / location.
- `destination` (`text DEFAULT NULL`): Destination point / location.

### 2.3 `employee_compensation` Table Enhancements
Add custom OT hourly rate override to `employee_compensation`:
- `ot_hourly_rate` (`numeric(14,4) DEFAULT NULL`): Optional custom hourly overtime rate override. If `NULL` or `<= 0`, payroll falls back to standard basic salary formula.

---

## 3. Domain Logic & Calculations

### 3.1 `@hrms/domain` Overtime Calculation (`packages/domain/src/payroll/overtime.ts`)
Update `computeOtPay`:
```ts
export function computeOtPay(
  hours: number,
  multiplier: number,
  monthlyBasic: Money,
  divisor = 26,
  hourlyRateOverride?: Money | null,
): Money {
  if (hours <= 0) return money(0);
  if (hourlyRateOverride && hourlyRateOverride.gt(0)) {
    return hourlyRateOverride.mul(hours).mul(multiplier).toDecimalPlaces(2);
  }
  if (divisor <= 0) return money(0);
  return monthlyBasic.div(divisor).mul(hours).mul(multiplier).toDecimalPlaces(2);
}
```

### 3.2 Payroll Feeds & Calculation (`apps/web/src/lib/payroll`)
1. **`apps/web/src/lib/payroll/feeds/shared.ts`**:
   - Update `EmployeePayInput` type to include `otHourlyRate?: number | null`.
2. **`apps/web/src/lib/payroll/feeds/overtime.ts`**:
   - In `aggregateOtPayByEmployee`, read `employee.otHourlyRate` and pass as `hourlyRateOverride` to `computeOtPay`.
3. **`apps/web/src/lib/payroll/generate.ts`**:
   - Include `ot_hourly_rate` when querying `employee_compensation` in `buildEmployeePayLines` and payrun generation.
4. **`apps/web/src/lib/payroll/compensation.ts`**:
   - Include `otHourlyRate` in `EmployeeCompensation` interface, `getEmployeeCompensation()`, and `upsertEmployeeCompensation()`.

---

## 4. UI & Portal Implementation

### 4.1 Claim Types & Mileage Settings (HR Admin)
- In HR Organization settings / Claim Types management (`apps/web/src/components/hr/organization/` or claim types actions):
  - Allow HR administrators to configure claim types with `is_mileage` toggle and `rate_per_km` input.

### 4.2 Employee Compensation Profile (HR Admin)
- **`apps/web/src/components/hr/employees/employee-compensation-panel.tsx`**:
  - Add input field for **Hourly OT Rate Override (RM)** (`otHourlyRate`).
  - Add descriptive helper text: *"Optional. Leave blank to calculate OT using the standard Employment Act formula based on basic salary."*

### 4.3 Employee Claim Submission (`apps/web/src/app/(employee)/employee/claims`)
- **Client Form Component (`apps/web/src/components/employee/claim-form.tsx` or `page.tsx`)**:
  - Detect when selected claim type has `is_mileage: true`.
  - Dynamically render inputs for:
    - **Origin** (text)
    - **Destination** (text)
    - **Distance (km)** (number)
    - **Rate per km** (read-only display / badge)
    - **Total Amount** (auto-calculated: `distance * rate_per_km`, with clear preview)
- **`apps/web/src/app/(employee)/employee/actions.ts`**:
  - Validate mileage fields with `@hrms/validation` Zod schema (`claimSchema`).
  - Store `distance_km`, `rate_per_km`, `origin`, `destination`, and `is_mileage` in `claims` record and approval request payload.

### 4.4 Approval Views & Claim Details
- **`apps/web/src/app/(manager)/manager/approvals/[stepId]`** & **`apps/web/src/app/(hr)/hr/operations/[stepId]`**:
  - Approval payload summary formatted to display trip itinerary: `Trip: [Origin] → [Destination] ([Distance] km @ RM [Rate]/km)`.
- **`apps/web/src/app/(employee)/employee/claims/[requestId]`**:
  - Display trip details (Origin, Destination, Distance, Applied Rate) alongside the total amount and approval status.

---

## 5. Verification & Test Plan

1. **Domain & Unit Tests**:
   - `packages/domain/src/payroll/overtime.test.ts`: Test standard salary-based OT calculation and custom hourly OT rate override calculation with multipliers (1.5x, 2.0x, 3.0x).
   - Payroll feed tests: Validate `aggregateOtPayByEmployee` handles employees with and without OT rate overrides in the same payrun.
   - Claim validation tests: Test Zod validation for standard claims vs mileage claims.
2. **Typecheck & Linting**:
   - Run `pnpm typecheck` and `pnpm lint`.
3. **End-to-End Flow Verification**:
   - Verify claim submission form auto-calculation.
   - Verify manager approval display.
   - Verify payroll generation reflects custom OT rate and approved mileage claims.
