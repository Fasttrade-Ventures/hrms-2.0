# PCB Manual Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default PCB stays auto (`pcbMtdFull`); HR can set a sticky manual PCB amount that replaces auto on every payrun until cleared, still labeled **PCB**, with net pay recalculating.

**Architecture:** Persist `pcb_manual_amount` on `employee_tax_profiles`. Pass it into `EmployeePayrunInput`; `computeEmployeePayrun` uses the manual amount when set, otherwise `pcbMtdFull`. Draft PCB edits upsert the sticky profile field then recalc. Payslip/exports unchanged (single PCB).

**Tech Stack:** TypeScript, Vitest (`packages/domain`), Next.js server actions, Supabase migrations, existing payroll UI panels.

**Spec:** [2026-11-06-pcb-manual-override-design.md](../specs/2026-11-06-pcb-manual-override-design.md)

## Global Constraints

- Default path remains auto LHDN PCB when `pcb_manual_amount` is null.
- Override is a fixed **total** PCB (≥ 0), not “extra on top”.
- Sticky until cleared; draft PCB edit writes sticky for future months.
- Product copy: **PCB** / “Use manual amount” / “Clear — use auto” — never “voluntary”.
- Override changes PCB + net only; gross and other statutory unchanged.
- HR administrator / payroll processor only; employees cannot set override.
- Manual amount is not forced through 5-sen ceil.

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20261106090000_pcb_manual_override.sql` | Add sticky columns on `employee_tax_profiles` |
| `packages/domain/src/payroll/payrun-pipeline.ts` | Honour `pcbManualAmount` in compute |
| `packages/domain/src/payroll/payrun-pipeline.test.ts` | Domain unit tests for override |
| `apps/web/src/lib/payroll/build-compute-input.ts` | Map `pcb_manual_amount` → compute input |
| `apps/web/src/lib/payroll/generate.ts` | Select `pcb_manual_amount` when generating |
| `apps/web/src/lib/payroll/edit.ts` | Select field; preserve override on recalc; add PCB override helper |
| `apps/web/src/lib/payroll/compensation.ts` | Read/write sticky amount on tax profile |
| `apps/web/src/app/(hr)/hr/payroll/actions.ts` | Actions for profile + draft PCB override |
| `apps/web/src/components/hr/employees/employee-tax-profile-panel.tsx` | HR UI for set/clear |
| `apps/web/src/components/hr/payroll/payrun-lines-table.tsx` | Editable PCB on draft |
| `docs/features.md` | One-line feature note |

---

### Task 1: Domain — honour `pcbManualAmount`

**Files:**
- Modify: `packages/domain/src/payroll/payrun-pipeline.ts`
- Modify: `packages/domain/src/payroll/payrun-pipeline.test.ts`

**Interfaces:**
- Consumes: existing `pcbMtdFull`, `money`, `EmployeePayrunInput`
- Produces: `EmployeePayrunInput.pcbManualAmount?: Money | null` — when non-null, `result.pcb` equals that amount; net uses it

- [ ] **Step 1: Write the failing tests**

Add to `payrun-pipeline.test.ts`:

```ts
it("uses pcbManualAmount instead of auto PCB when set", () => {
  const auto = computeEmployeePayrun(baseInput);
  const manual = computeEmployeePayrun({
    ...baseInput,
    pcbManualAmount: money(350),
  });

  expect(auto.pcb.toNumber()).not.toBe(350);
  expect(manual.pcb.toNumber()).toBe(350);
  expect(manual.gross.toNumber()).toBe(auto.gross.toNumber());
  expect(manual.net.toNumber()).toBe(
    auto.net.add(auto.pcb).sub(money(350)).toNumber(),
  );
});

it("allows pcbManualAmount of zero", () => {
  const auto = computeEmployeePayrun(baseInput);
  const manual = computeEmployeePayrun({
    ...baseInput,
    pcbManualAmount: money(0),
  });

  expect(manual.pcb.toNumber()).toBe(0);
  expect(manual.net.toNumber()).toBe(auto.net.add(auto.pcb).toNumber());
});

it("falls back to auto PCB when pcbManualAmount is null or omitted", () => {
  const omitted = computeEmployeePayrun(baseInput);
  const explicitNull = computeEmployeePayrun({
    ...baseInput,
    pcbManualAmount: null,
  });

  expect(explicitNull.pcb.toNumber()).toBe(omitted.pcb.toNumber());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/domain/src/payroll/payrun-pipeline.test.ts -v`

Expected: FAIL — `pcbManualAmount` not on type / PCB still auto.

- [ ] **Step 3: Implement minimal domain change**

In `EmployeePayrunInput` add:

```ts
pcbManualAmount?: Money | null;
```

Replace the PCB assignment in `computeEmployeePayrun` (currently always `pcbMtdFull(...)`) with:

```ts
const autoPcb = pcbMtdFull({
  frequency: input.frequency,
  periodGross: pcbGross,
  periodEpf: epfEmp,
  periodSocso: socso.employee,
  periodEis: eisEmp,
  tp1: input.tp1,
  ytd: input.ytd,
  asOf: input.asOf,
  maritalCategory: input.maritalCategory,
});
const pcb =
  input.pcbManualAmount != null ? input.pcbManualAmount : autoPcb;
```

Do not change EPF/SOCSO/EIS/gross calculation.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/domain/src/payroll/payrun-pipeline.test.ts -v`

Expected: PASS (including existing cases).

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/payroll/payrun-pipeline.ts packages/domain/src/payroll/payrun-pipeline.test.ts
git commit -m "$(cat <<'EOF'
feat(payroll): honour sticky manual PCB amount in compute pipeline

EOF
)"
```

---

### Task 2: Migration — sticky columns on tax profile

**Files:**
- Create: `supabase/migrations/20261106090000_pcb_manual_override.sql`

**Interfaces:**
- Produces: `employee_tax_profiles.pcb_manual_amount numeric(14,2) null`, `pcb_manual_updated_at timestamptz null`, `pcb_manual_updated_by uuid null references auth.users(id) on delete set null`

- [ ] **Step 1: Add migration**

```sql
alter table public.employee_tax_profiles
  add column if not exists pcb_manual_amount numeric(14,2),
  add column if not exists pcb_manual_updated_at timestamptz,
  add column if not exists pcb_manual_updated_by uuid references auth.users(id) on delete set null;

comment on column public.employee_tax_profiles.pcb_manual_amount is
  'When not null, payrun PCB uses this total instead of auto MTD. UI label remains PCB.';

alter table public.employee_tax_profiles
  drop constraint if exists employee_tax_profiles_pcb_manual_amount_nonneg;

alter table public.employee_tax_profiles
  add constraint employee_tax_profiles_pcb_manual_amount_nonneg
  check (pcb_manual_amount is null or pcb_manual_amount >= 0);
```

- [ ] **Step 2: Apply locally (if Supabase local is available)**

Run: `pnpm supabase db reset` or project’s usual migration apply command.

Expected: migration applies; existing tax profile rows have null override.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261106090000_pcb_manual_override.sql
git commit -m "$(cat <<'EOF'
feat(db): add pcb_manual_amount sticky override on tax profiles

EOF
)"
```

---

### Task 3: Wire generate + build-compute-input + edit recalc

**Files:**
- Modify: `apps/web/src/lib/payroll/build-compute-input.ts`
- Modify: `apps/web/src/lib/payroll/generate.ts` (select list + pass-through via tax profile)
- Modify: `apps/web/src/lib/payroll/edit.ts` (select list)
- Modify: `apps/web/src/lib/payroll/calculator-compare.ts` if it builds compute input the same way

**Interfaces:**
- Consumes: `taxProfile.pcb_manual_amount`
- Produces: `EmployeePayrunInput.pcbManualAmount` set when amount is not null

- [ ] **Step 1: Map field in `buildEmployeePayrunComputeInput`**

After reading `taxProfile`, add:

```ts
pcbManualAmount:
  input.taxProfile &&
  input.taxProfile.pcb_manual_amount !== undefined &&
  input.taxProfile.pcb_manual_amount !== null &&
  String(input.taxProfile.pcb_manual_amount) !== ""
    ? money(String(input.taxProfile.pcb_manual_amount))
    : null,
```

Include on the returned `EmployeePayrunInput` object.

- [ ] **Step 2: Extend selects**

In `generate.ts` and `edit.ts` (and any sibling select of `employee_tax_profiles(...)`), change to:

```ts
employee_tax_profiles(marital_status, spouse_working, zakat_annual, zakat_monthly, tp1_payload, pcb_manual_amount)
```

- [ ] **Step 3: Smoke domain mapping mentally / unit if present**

If there is no web unit test harness for build-compute-input, skip automated test here; domain tests already cover compute. Manually verify TypeScript:

Run: `pnpm --filter @hrms/domain typecheck` and `pnpm --filter web typecheck` (or repo `pnpm typecheck`)

Expected: no type errors on new field.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/payroll/build-compute-input.ts apps/web/src/lib/payroll/generate.ts apps/web/src/lib/payroll/edit.ts apps/web/src/lib/payroll/calculator-compare.ts
git commit -m "$(cat <<'EOF'
feat(payroll): pass pcb_manual_amount into payrun compute input

EOF
)"
```

---

### Task 4: Compensation lib — set / clear sticky PCB

**Files:**
- Modify: `apps/web/src/lib/payroll/compensation.ts`
- Modify: `apps/web/src/app/(hr)/hr/payroll/actions.ts`

**Interfaces:**
- Produces:
  - `EmployeeTaxProfile.pcbManualAmount: number | null`
  - `upsertEmployeeTaxProfile` accepts optional `pcbManualAmount: number | null` (null = clear / auto)
  - `setEmployeePcbManualAmount(employeeId, amount: number | null, userId: string): Promise<void>`

- [ ] **Step 1: Extend `EmployeeTaxProfile` and readers**

```ts
export type EmployeeTaxProfile = {
  // ...existing fields
  pcbManualAmount: number | null;
};
```

In `getEmployeeTaxProfile`, select `pcb_manual_amount` and return:

```ts
pcbManualAmount:
  tax?.pcb_manual_amount === null || tax?.pcb_manual_amount === undefined
    ? null
    : Number(tax.pcb_manual_amount),
```

- [ ] **Step 2: Add dedicated setter (preferred over stuffing into TP1 upsert)**

```ts
export async function setEmployeePcbManualAmount(
  employeeId: string,
  amount: number | null,
  userId: string,
): Promise<void> {
  await requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
  const organizationId = await requireOrganizationId();
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    throw new Error("PCB amount must be zero or greater.");
  }
  const supabase = await createClient();
  await ensureEmployeeTaxProfile(employeeId);
  const { error } = await supabase
    .from("employee_tax_profiles")
    .update({
      pcb_manual_amount: amount,
      pcb_manual_updated_at: new Date().toISOString(),
      pcb_manual_updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}
```

Use the project’s real auth helper names (`requireRoleOrPermission` vs `requireRole`) to match `edit.ts` / payroll actions.

When `upsertEmployeeTaxProfile` runs for TP1 fields, **do not wipe** `pcb_manual_amount` — only update columns that form sends (leave PCB columns untouched unless explicitly included).

- [ ] **Step 3: Server action**

In `actions.ts`:

```ts
export async function setEmployeePcbManualAmountAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const mode = String(formData.get("pcbMode") ?? "auto"); // "auto" | "manual"
  const raw = String(formData.get("pcbManualAmount") ?? "");
  try {
    const session = await guardPayroll();
    const { setEmployeePcbManualAmount } = await import("@/lib/payroll/compensation");
    if (mode === "auto") {
      await setEmployeePcbManualAmount(employeeId, null, session.user.id);
    } else {
      const amount = Number(raw);
      await setEmployeePcbManualAmount(employeeId, amount, session.user.id);
    }
    revalidateEmployee(employeeId);
    return { success: "PCB setting saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save PCB." };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/payroll/compensation.ts apps/web/src/app/(hr)/hr/payroll/actions.ts
git commit -m "$(cat <<'EOF'
feat(payroll): set and clear sticky PCB amount on employee tax profile

EOF
)"
```

---

### Task 5: Draft payrun PCB override (writes sticky + recalc)

**Files:**
- Modify: `apps/web/src/lib/payroll/edit.ts`
- Modify: `apps/web/src/app/(hr)/hr/payroll/actions.ts`

**Interfaces:**
- Produces: `overridePayrunPcb(payrunItemId: string, amount: number | null, userId: string): Promise<void>`
  - `amount === null` clears sticky and recalcs auto
  - `amount >= 0` sets sticky then recalcs with manual PCB

- [ ] **Step 1: Implement `overridePayrunPcb` in `edit.ts`**

Reuse the load/recalc structure of `editPayrunLine`, but:

1. Guard draft status (same as edit).
2. Call `setEmployeePcbManualAmount(employeeId, amount, userId)` (import from compensation) **or** inline the same upsert so sticky is updated first.
3. Rebuild non-statutory lines from components (same as today).
4. Call `buildEmployeePayrunComputeInput` with tax profile that includes the new `pcb_manual_amount`.
5. Persist `payrunItemPatchFromResult` + rewrite statutory component rows including `DED_PCB`.

Do **not** route PCB through `editPayrunLine` for arbitrary codes — that path still overwrites statutory from compute; sticky must be set **before** compute so recalc keeps the manual value.

Reject negative amounts with `throw new Error("PCB amount must be zero or greater.")`.

- [ ] **Step 2: Action**

```ts
export async function overridePayrunPcbAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunItemId = String(formData.get("payrunItemId") ?? "");
  const payrunId = String(formData.get("payrunId") ?? "");
  const clear = String(formData.get("clear") ?? "") === "1";
  const amountRaw = String(formData.get("amount") ?? "");
  try {
    const session = await guardPayroll();
    const { overridePayrunPcb } = await import("@/lib/payroll/edit");
    await overridePayrunPcb(
      payrunItemId,
      clear ? null : Number(amountRaw),
      session.user.id,
    );
    revalidatePath("/hr/payroll");
    if (payrunId) revalidatePath(`/hr/payroll/${payrunId}`);
    return {
      success: clear
        ? "PCB cleared — using auto calculation."
        : "PCB updated for this and future payruns. Net recalculated.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update PCB." };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/payroll/edit.ts apps/web/src/app/(hr)/hr/payroll/actions.ts
git commit -m "$(cat <<'EOF'
feat(payroll): draft PCB override updates sticky amount and net

EOF
)"
```

---

### Task 6: HR UI — tax panel + draft PCB editor

**Files:**
- Modify: `apps/web/src/components/hr/employees/employee-tax-profile-panel.tsx`
- Create: `apps/web/src/components/hr/payroll/edit-pcb-dialog.tsx` (or extend edit-line pattern)
- Modify: `apps/web/src/components/hr/payroll/payrun-lines-table.tsx`

**Interfaces:**
- Consumes: `setEmployeePcbManualAmountAction`, `overridePayrunPcbAction`
- Produces: HR-only controls; employee payslip untouched

- [ ] **Step 1: Tax profile panel**

Add a section **PCB** (not “voluntary”):

- Radio or select: `Auto (calculated each payrun)` vs `Use manual amount`
- Number input when manual
- Submit via `setEmployeePcbManualAmountAction`
- Helper (HR only): “Manual amount applies to this and future payruns until cleared. Payslips still show PCB.”

Default UI state from `taxProfile.pcbManualAmount !== null`.

- [ ] **Step 2: Draft payrun PCB cell**

When `options.editable`, render an editor for PCB (similar to `EditLineDialog`) bound to `overridePayrunPcbAction` with `payrunItemId`, `payrunId`, `amount`, and optional Clear control (`clear=1`).

Keep column header **PCB**. Optional small “Manual” text for HR when amount came from sticky — only if cheap (e.g. compare item pcb to profile); otherwise skip badge (spec nice-to-have).

- [ ] **Step 3: Manual UI check**

Expected:
- Set manual on employee → new draft PCB equals amount; net lower/higher accordingly
- Edit PCB on draft → next generate for same employee keeps amount
- Clear → auto returns
- Payslip PDF still `PCB (Tax)` only

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/hr/employees/employee-tax-profile-panel.tsx apps/web/src/components/hr/payroll/edit-pcb-dialog.tsx apps/web/src/components/hr/payroll/payrun-lines-table.tsx
git commit -m "$(cat <<'EOF'
feat(payroll): HR UI to set sticky PCB and edit PCB on draft payruns

EOF
)"
```

---

### Task 7: Docs touch-up

**Files:**
- Modify: `docs/features.md` (Payroll / PCB row)
- Modify: `docs/superpowers/specs/2026-11-06-pcb-manual-override-design.md` status already Approved

- [ ] **Step 1: Add feature note**

Under payroll / PCB section, add roughly:

```md
| PCB manual override (sticky total) | Pro | ✅ | Default auto MTD; HR may set fixed PCB on tax profile or draft; payslip still shows PCB |
```

Adjust table columns to match surrounding `features.md` legend.

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "$(cat <<'EOF'
docs: note PCB sticky manual override in features matrix

EOF
)"
```

---

## Spec coverage checklist

| Spec decision | Task |
|---------------|------|
| Default auto PCB | 1, 3 |
| Fixed total override | 1, 4, 5 |
| Sticky until cleared | 2, 4, 5 |
| Draft edit writes sticky for other months | 5, 6 |
| Label PCB only | 6, 7 |
| Net recalculates; gross unchanged | 1, 5 |
| Salary change keeps manual PCB | 3 (generate uses sticky) |
| YTD / exports as normal PCB | no code change (same `pcb` field) |
| HR/processor only | 4, 5 |
| Migration columns | 2 |

## Placeholder / consistency review

- Field name `pcbManualAmount` / `pcb_manual_amount` used consistently.
- Clear = `null`, not `0` (0 is a valid manual amount).
- No “voluntary” copy in UI steps.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-06-pcb-manual-override.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach?
