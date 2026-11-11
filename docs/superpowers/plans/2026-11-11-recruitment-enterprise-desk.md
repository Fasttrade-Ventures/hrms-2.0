# Recruitment Enterprise Hiring Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/hr/recruitment` into an enterprise internal hiring desk (requisition hub, candidate detail, offer lifecycle) with accept-offer → draft employee + auto-start onboarding checklist, without building a public careers ATS.

**Architecture:** Extend existing Phase 6 recruitment tables and services in place. Pure transition helpers + Zod schemas first; services next; hub → slim board → candidate detail UI; offer transitions; then harden `acceptOffer` for checklist handoff and recruiter-safe redirect. No new domain tables expected.

**Tech Stack:** Next.js App Router (`apps/web`), Zod (`@hrms/validation`), Supabase admin client, Vitest, existing portal UI primitives, `buildSimplePdf` / `/api/files/[fileId]/download`.

**Spec:** [`docs/superpowers/specs/2026-11-11-recruitment-enterprise-desk-design.md`](../specs/2026-11-11-recruitment-enterprise-desk-design.md)

## Global Constraints

- Internal HRMS hiring desk only — not a standalone recruitment platform.
- Public careers / apply portal: out of scope.
- Accept offer: draft employee + auto-start onboarding checklist; activation email stays manual.
- Fixed stages: `applied` → `screening` → `interview` → `assessment` → `offer` → `hired` | `rejected` | `withdrawn`.
- Hire employees only via Accept offer (never via stage button to `hired`).
- Salary/PDF currency from organization currency — no hardcoded `RM`.
- Signed PDF upload and outbound “offer sent” email: deferred.
- Prefer existing columns; migration only if a real gap appears.
- Do not commit unless the user explicitly asks (plan commit steps are optional checkpoints).

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/validation/src/recruitment.ts` | Zod for update/status/source/offer transitions |
| `apps/web/src/lib/recruitment/types.ts` | Stage helpers + `nextAdvanceStages` (excludes `hired`) |
| `apps/web/src/lib/recruitment/requisition-status.ts` | Pure `canTransitionRequisitionStatus` |
| `apps/web/src/lib/recruitment/offer-status.ts` | Pure `canTransitionOfferStatus` |
| `apps/web/src/lib/recruitment/requisitions.ts` | List (enriched), get, update, setStatus |
| `apps/web/src/lib/recruitment/applications.ts` | Add candidate (source + email reuse), assert open req, detail loader |
| `apps/web/src/lib/recruitment/offers.ts` | Create (history), markSent/decline/withdraw, accept + checklist |
| `apps/web/src/lib/recruitment/offer-pdf.ts` | Currency-aware PDF lines |
| `apps/web/src/lib/employees/start-onboarding-checklist.ts` | Shared soft-start helper (no `requireRole`) |
| `apps/web/src/app/(hr)/hr/recruitment/actions.ts` | Server actions for all mutations |
| `apps/web/src/components/hr/recruitment/*` | Hub, forms, slim board, candidate panels |
| `apps/web/src/app/(hr)/hr/recruitment/.../candidates/[applicationId]/page.tsx` | Candidate detail route |
| `apps/web/src/app/(hr)/hr/employees/[employeeId]/edit/page.tsx` | `hired=1` banner |
| `tests/recruitment/*.test.ts` | Unit coverage |

---

### Task 1: Validation + pure transition helpers

**Files:**
- Modify: `packages/validation/src/recruitment.ts`
- Modify: `apps/web/src/lib/recruitment/types.ts`
- Create: `apps/web/src/lib/recruitment/requisition-status.ts`
- Create: `apps/web/src/lib/recruitment/offer-status.ts`
- Modify: `apps/web/src/lib/recruitment/offer-pdf.ts`
- Test: `tests/recruitment/types.test.ts`
- Create: `tests/recruitment/requisition-status.test.ts`
- Create: `tests/recruitment/offer-status.test.ts`
- Create: `tests/recruitment/offer-pdf.test.ts`

**Interfaces:**
- Consumes: existing `createRequisitionSchema`, `RECRUITMENT_STAGES`, `canMoveToStage`
- Produces:
  - `updateRequisitionSchema`, `setRequisitionStatusSchema` (`status: "open" \| "on_hold" \| "closed"`)
  - `addCandidateSchema` gains optional `source: z.string().max(100).optional().nullable()`
  - `setOfferStatusSchema` (`offerId`, `status: "sent" \| "declined" \| "withdrawn"`)
  - `canTransitionRequisitionStatus(from, to): boolean`
  - `canTransitionOfferStatus(from, to): boolean`
  - `nextAdvanceStages(current): RecruitmentStage[]` — forward only, excludes `hired`/`rejected`/`withdrawn`
  - `buildOfferPdfLines({ ..., currencyCode: string })`

- [ ] **Step 1: Write failing tests for requisition/offer transitions and nextAdvanceStages**

```ts
// tests/recruitment/requisition-status.test.ts
import { describe, expect, it } from "vitest";
import { canTransitionRequisitionStatus } from "@/lib/recruitment/requisition-status";

describe("canTransitionRequisitionStatus", () => {
  it("allows open → on_hold, open → closed, on_hold → closed, closed → open, on_hold → open", () => {
    expect(canTransitionRequisitionStatus("open", "on_hold")).toBe(true);
    expect(canTransitionRequisitionStatus("open", "closed")).toBe(true);
    expect(canTransitionRequisitionStatus("on_hold", "closed")).toBe(true);
    expect(canTransitionRequisitionStatus("closed", "open")).toBe(true);
    expect(canTransitionRequisitionStatus("on_hold", "open")).toBe(true);
  });
  it("blocks closed → on_hold and same-status no-ops as false", () => {
    expect(canTransitionRequisitionStatus("closed", "on_hold")).toBe(false);
    expect(canTransitionRequisitionStatus("open", "open")).toBe(false);
  });
});
```

```ts
// tests/recruitment/offer-status.test.ts
import { describe, expect, it } from "vitest";
import { canTransitionOfferStatus } from "@/lib/recruitment/offer-status";

describe("canTransitionOfferStatus", () => {
  it("allows draft|sent → sent|declined|withdrawn as defined", () => {
    expect(canTransitionOfferStatus("draft", "sent")).toBe(true);
    expect(canTransitionOfferStatus("draft", "declined")).toBe(true);
    expect(canTransitionOfferStatus("sent", "declined")).toBe(true);
    expect(canTransitionOfferStatus("draft", "withdrawn")).toBe(true);
  });
  it("blocks transitions from accepted/declined/withdrawn", () => {
    expect(canTransitionOfferStatus("accepted", "sent")).toBe(false);
    expect(canTransitionOfferStatus("declined", "sent")).toBe(false);
  });
});
```

```ts
// append to tests/recruitment/types.test.ts
import { nextAdvanceStages } from "@/lib/recruitment/types";

it("nextAdvanceStages never includes hired", () => {
  expect(nextAdvanceStages("assessment")).toEqual(["offer"]);
  expect(nextAdvanceStages("offer")).toEqual([]);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run tests/recruitment/requisition-status.test.ts tests/recruitment/offer-status.test.ts tests/recruitment/types.test.ts`

- [ ] **Step 3: Implement helpers + Zod**

```ts
// apps/web/src/lib/recruitment/requisition-status.ts
export type RequisitionStatus = "open" | "on_hold" | "closed";

const ALLOWED: Record<RequisitionStatus, RequisitionStatus[]> = {
  open: ["on_hold", "closed"],
  on_hold: ["open", "closed"],
  closed: ["open"],
};

export function canTransitionRequisitionStatus(from: RequisitionStatus, to: RequisitionStatus): boolean {
  if (from === to) return false;
  return ALLOWED[from].includes(to);
}
```

```ts
// apps/web/src/lib/recruitment/offer-status.ts
export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "withdrawn";

export function canTransitionOfferStatus(from: OfferStatus, to: OfferStatus): boolean {
  if (from === "accepted" || from === "declined" || from === "withdrawn") return false;
  if (to === "sent") return from === "draft" || from === "sent";
  if (to === "declined" || to === "withdrawn") return from === "draft" || from === "sent";
  return false;
}
```

In `types.ts` add:

```ts
export function nextAdvanceStages(current: RecruitmentStage): RecruitmentStage[] {
  const idx = RECRUITMENT_STAGES.indexOf(current);
  if (idx < 0 || TERMINAL_STAGES.includes(current)) return [];
  return RECRUITMENT_STAGES.slice(idx + 1).filter(
    (s) => s !== "hired" && s !== "rejected" && s !== "withdrawn",
  );
}
```

Extend `packages/validation/src/recruitment.ts` with `updateRequisitionSchema` (same fields as create + `requisitionId`), `setRequisitionStatusSchema`, `source` on `addCandidateSchema`, `setOfferStatusSchema`.

- [ ] **Step 4: Offer PDF currency test + implement**

```ts
// tests/recruitment/offer-pdf.test.ts
it("labels salary with currency code", () => {
  const lines = buildOfferPdfLines({
    organizationName: "Acme",
    candidateName: "Ada",
    jobTitle: "Engineer",
    basicSalary: 1000,
    startDate: "2026-12-01",
    currencyCode: "AUD",
  });
  expect(lines.some((l) => l.includes("AUD") && l.includes("1000.00"))).toBe(true);
  expect(lines.some((l) => l.includes("(RM)"))).toBe(false);
});
```

Update `buildOfferPdfLines` / `buildOfferPdf` to take `currencyCode: string` and render `Basic salary (${currencyCode}): …`.

- [ ] **Step 5: Re-run tests — expect PASS**

Run: `pnpm exec vitest run tests/recruitment/`

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add packages/validation/src/recruitment.ts apps/web/src/lib/recruitment/types.ts apps/web/src/lib/recruitment/requisition-status.ts apps/web/src/lib/recruitment/offer-status.ts apps/web/src/lib/recruitment/offer-pdf.ts tests/recruitment/
git commit -m "$(cat <<'EOF'
feat(recruitment): add validation and transition helpers for hiring desk

EOF
)"
```

---

### Task 2: Requisition service — list, update, status

**Files:**
- Modify: `apps/web/src/lib/recruitment/requisitions.ts`
- Modify: `apps/web/src/app/(hr)/hr/recruitment/actions.ts`
- Test: `tests/recruitment/requisition-status.test.ts` (keep); service logic covered by transition helper + manual/local smoke — optional thin test if mocking admin is hard; do not invent fake Supabase unless pattern exists

**Interfaces:**
- Consumes: `canTransitionRequisitionStatus`, `updateRequisitionSchema`, `setRequisitionStatusSchema`
- Produces:
  - `listRequisitions(): Promise<RequisitionListItem[]>` where item includes `id, title, status, headcount, employmentType, departmentId, branchId, departmentName?, branchName?, hiredCount, openPipelineCount, createdAt`
  - `getRequisition(id): Promise<… | null>`
  - `updateRequisition(input, actorUserId): Promise<void>`
  - `setRequisitionStatus(requisitionId, status, actorUserId): Promise<void>`
  - Actions: `updateRequisitionAction`, `setRequisitionStatusAction`

- [ ] **Step 1: Expand `listRequisitions` select**

Select `id, title, status, headcount, employment_type, department_id, branch_id, created_at, departments(name), branches(name)`. For each requisition, count applications where `stage = 'hired'` and where stage not in terminal (`hired|rejected|withdrawn`) as open pipeline — either one aggregated query or two count queries scoped by org. Throw on error.

- [ ] **Step 2: Implement `updateRequisition` and `setRequisitionStatus`**

```ts
export async function setRequisitionStatus(
  requisitionId: string,
  toStatus: RequisitionStatus,
): Promise<void> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();
  const { data: row } = await admin
    .from("job_requisitions")
    .select("id, status")
    .eq("id", requisitionId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!row) throw new Error("Requisition not found.");
  if (!canTransitionRequisitionStatus(row.status as RequisitionStatus, toStatus)) {
    throw new Error(`Cannot change status from ${row.status} to ${toStatus}.`);
  }
  const { error } = await admin
    .from("job_requisitions")
    .update({ status: toStatus })
    .eq("id", requisitionId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}
```

`updateRequisition`: parse `updateRequisitionSchema`; reject if current status is `closed`; update title/description/headcount/department_id/branch_id/employment_type.

- [ ] **Step 3: Wire actions**

Mirror `createRequisitionAction` auth (`requireModule("recruitment")` + `requireRoleOrPermission([...], ["recruiter"])`). Revalidate `/hr/recruitment` and `/hr/recruitment/[id]`.

- [ ] **Step 4: Smoke via unit helpers still PASS**

Run: `pnpm exec vitest run tests/recruitment/`

- [ ] **Step 5: Commit (only if user asked)**

---

### Task 3: Requisition hub UI

**Files:**
- Modify: `apps/web/src/app/(hr)/hr/recruitment/page.tsx`
- Modify: `apps/web/src/components/hr/recruitment/create-requisition-form.tsx` (or split `requisition-form.tsx`)
- Create: `apps/web/src/components/hr/recruitment/requisition-hub.tsx`
- Need branch/department options: reuse whatever org list helpers other HR forms use (search `listBranches` / `listDepartments` under `apps/web/src/lib`)

**Interfaces:**
- Consumes: `listRequisitions`, create/update/status actions
- Produces: usable hub matching spec §4

- [ ] **Step 1: Load filter options on the page**

In `page.tsx`, load requisitions + branches + departments. Pass into `RequisitionHub`.

- [ ] **Step 2: Build hub list**

For each requisition show: title link to `/hr/recruitment/[id]`, status badge, dept · branch · employment type, `{hiredCount} / {headcount} hired`, `{openPipelineCount} in pipeline`. Client filters: status select, branch, department, title search (client-side on loaded list is fine for v1).

- [ ] **Step 3: Create/edit form fields**

Add employment type select, department select, branch select to create form. Add edit form for open/on_hold (same fields). Status buttons: Hold / Close / Re-open calling `setRequisitionStatusAction`.

- [ ] **Step 4: Manual check**

Open `http://localhost:3000/hr/recruitment` as HR: create with dept/branch, hold, re-open, close. Confirm list counts render.

- [ ] **Step 5: Commit (only if user asked)**

---

### Task 4: Candidates — source, email reuse, open-req guard

**Files:**
- Modify: `apps/web/src/lib/recruitment/applications.ts`
- Modify: `apps/web/src/components/hr/recruitment/create-requisition-form.tsx` (`AddCandidateForm`)
- Modify: `apps/web/src/app/(hr)/hr/recruitment/actions.ts`
- Create: `tests/recruitment/add-candidate-guard.test.ts` only if extractable pure helper; otherwise document smoke

**Interfaces:**
- Consumes: extended `addCandidateSchema`
- Produces: `addCandidateToRequisition` writes `source`; reuses candidate by org+email; throws if requisition status ≠ `open`

- [ ] **Step 1: Assert requisition is open before insert**

```ts
const { data: requisition } = await admin
  .from("job_requisitions")
  .select("id, status")
  ...
if (!requisition) throw new Error("Requisition not found.");
if (requisition.status !== "open") {
  throw new Error("Candidates can only be added to open requisitions.");
}
```

- [ ] **Step 2: Reuse candidate by email**

```ts
const email = parsed.email.trim().toLowerCase();
const { data: existing } = await admin
  .from("job_candidates")
  .select("id")
  .eq("organization_id", organizationId)
  .eq("email", email)
  .maybeSingle();

let candidateId = existing?.id;
if (!candidateId) {
  const { data: candidate, error } = await admin.from("job_candidates").insert({
    organization_id: organizationId,
    full_name: parsed.fullName.trim(),
    email,
    phone: parsed.phone?.trim() ?? null,
    source: parsed.source?.trim() || null,
  }).select("id").single();
  if (error || !candidate) throw new Error(error?.message ?? "Failed to create candidate.");
  candidateId = candidate.id;
} else if (parsed.source?.trim()) {
  await admin.from("job_candidates").update({ source: parsed.source.trim() }).eq("id", candidateId);
}
```

Handle unique `(requisition_id, candidate_id)` conflict with a clear error: “This candidate is already on this requisition.”

- [ ] **Step 3: Add source field to `AddCandidateForm`; pass through action**

- [ ] **Step 4: Smoke** — add candidate on open req; fail on closed; second add same email different req reuses person

- [ ] **Step 5: Commit (only if user asked)**

---

### Task 5: Application detail loader + stage notes on board/detail

**Files:**
- Modify: `apps/web/src/lib/recruitment/applications.ts`
- Modify: `apps/web/src/lib/recruitment/offers.ts` (`createOfferForApplication` history)
- Create: `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/candidates/[applicationId]/page.tsx`
- Create: `apps/web/src/components/hr/recruitment/candidate-detail.tsx`
- Modify: `apps/web/src/components/hr/recruitment/recruitment-pipeline.tsx`
- Modify: `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/page.tsx`

**Interfaces:**
- Consumes: `moveApplicationStage`, `nextAdvanceStages`
- Produces:
  - `getApplicationDetail(requisitionId, applicationId)` → application, candidate, offer, history[], requisition status/title
  - Candidate page route
  - Slim board cards linking to detail

- [ ] **Step 1: Implement `getApplicationDetail`**

Select application joined to candidate + offers; select `job_application_stage_history` ordered by `created_at` for that application. Return null if wrong org/requisition.

- [ ] **Step 2: Fix `createOfferForApplication` history gap**

Before/after updating stage to `offer`, read prior stage; insert history row (`from_stage`, `to_stage: "offer"`, `changed_by`, notes `"Offer created."`). Skip insert if already `offer`.

- [ ] **Step 3: Candidate detail page**

Server page: `requireModule` + `requireRoleOrPermission`; load detail; render `CandidateDetail` with header, notes textarea on move forms, Withdraw (`toStage=withdrawn`), Reject, Advance using `nextAdvanceStages`, timeline list.

- [ ] **Step 4: Slim the board**

Cards: name, offer chip, link to candidate detail. Keep only Advance (via `nextAdvanceStages().slice(0,2)`) + Reject. Remove inline offer/accept forms from cards (move to detail). If requisition `on_hold`/`closed`, hide mutation buttons and show banner.

- [ ] **Step 5: Manual check** — open candidate URL, move with note, see timeline; board click works

- [ ] **Step 6: Commit (only if user asked)**

---

### Task 6: Offer lifecycle UI + PDF download

**Files:**
- Modify: `apps/web/src/lib/recruitment/offers.ts`
- Modify: `apps/web/src/app/(hr)/hr/recruitment/actions.ts`
- Modify: `apps/web/src/components/hr/recruitment/candidate-detail.tsx`
- Modify: `apps/web/src/lib/recruitment/offer-pdf.ts` callers to pass currency

**Interfaces:**
- Consumes: `canTransitionOfferStatus`, `setOfferStatusSchema`, org currency helper `getOrganizationDisplay` / `getOrganizationCurrency`
- Produces:
  - `markOfferSent(offerId, actorUserId): Promise<void>`
  - `declineOffer(offerId, actorUserId): Promise<void>` — offer declined + application → rejected + history
  - `withdrawOffer(offerId, actorUserId): Promise<void>` — offer withdrawn + application → withdrawn + history
  - Actions for each; accept still separate
  - PDF link `/api/files/${generated_file_id}/download`

- [ ] **Step 1: Implement mark/decline/withdraw in `offers.ts`**

Load offer + application; check `canTransitionOfferStatus`; update offer (`sent_at` when sent); for decline/withdraw also update application stage via same pattern as `moveApplicationStage` (or call it after offer update). Accept remains only for hire.

- [ ] **Step 2: Pass currency into `buildOfferPdf`**

In `createOfferForApplication`, load org currency (`organizations.currency`) and pass `currencyCode`.

- [ ] **Step 3: Offer panel on candidate detail**

If no offer and stage allows creating (assessment/offer or after advancing): create form. If offer exists: status, Download PDF, Mark sent, Accept (draft|sent), Decline, Withdraw — hide invalid actions per status.

- [ ] **Step 4: Actions + revalidate candidate path**

`revalidatePath(`/hr/recruitment/${requisitionId}/candidates/${applicationId}`)`.

- [ ] **Step 5: Manual check** — create offer, download PDF (currency correct), mark sent, decline on a throwaway candidate

- [ ] **Step 6: Commit (only if user asked)**

---

### Task 7: Accept offer → checklist + recruiter-safe landing + hired banner

**Files:**
- Create: `apps/web/src/lib/employees/start-onboarding-checklist.ts`
- Modify: `apps/web/src/lib/employees/checklist-service.ts` (delegate `startEmployeeChecklist` core insert to shared helper if clean)
- Modify: `apps/web/src/lib/recruitment/offers.ts` (`acceptOffer`)
- Modify: `apps/web/src/app/(hr)/hr/recruitment/actions.ts` (`acceptOfferAction`)
- Modify: `apps/web/src/app/(hr)/hr/employees/[employeeId]/edit/page.tsx`
- Create: `tests/recruitment/accept-offer-guards.test.ts` for pure offer-status accept guard if extracted; otherwise test `canAcceptOfferStatus(status)` helper

**Interfaces:**
- Consumes: checklist template tables, existing accept flow
- Produces:
  - `tryStartOnboardingChecklist(organizationId, employeeId): Promise<{ started: boolean; reason?: string }>`
  - `acceptOffer(...): Promise<{ employeeId: string; checklistStarted: boolean; checklistMessage?: string }>`
  - `canAcceptOfferStatus(status): boolean` — true for `draft` | `sent`
  - `acceptOfferAction` redirects HR/owner to employee edit; recruiter stays on candidate with success query

- [ ] **Step 1: Extract soft checklist starter**

```ts
// apps/web/src/lib/employees/start-onboarding-checklist.ts
export async function tryStartOnboardingChecklist(
  organizationId: string,
  employeeId: string,
): Promise<{ started: boolean; reason?: string }> {
  const admin = createAdminClient();
  // load onboarding template + items (copy logic from startEmployeeChecklist without requireRole)
  // if missing/empty: return { started: false, reason: "no_template" | "no_tasks" }
  // if employee already has onboarding tasks: return { started: false, reason: "already_started" }
  // else insert tasks; return { started: true }
}
```

Keep `startEmployeeChecklist` form action calling the same insert path for HR manual start.

- [ ] **Step 2: Harden `acceptOffer`**

- Load offer status; throw if not `draft`/`sent` or already `accepted`.
- After creating employee + linking application, call `tryStartOnboardingChecklist`.
- Do not throw if checklist soft-fails.
- Return checklist flags.

- [ ] **Step 3: Fix `acceptOfferAction` redirect**

```ts
const session = await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);
const { employeeId, checklistStarted, checklistMessage } = await acceptOffer(...);
const canEditEmployees = session.roles?.includes("hr_administrator") || session.roles?.includes("organization_owner");
// Use whatever session shape BukuHR actually exposes for roles — mirror other actions.
if (canEditEmployees) {
  redirect(`/hr/employees/${employeeId}/edit?hired=1&checklist=${checklistStarted ? "1" : "0"}`);
}
revalidatePath(candidatePath);
return {
  success: checklistStarted
    ? "Hire completed. Draft employee created and onboarding checklist started. Ask HR to complete profile and send activation."
    : `Hire completed. Draft employee created. ${checklistMessage ?? "Add an onboarding checklist template, then ask HR to send activation."}`,
};
```

Inspect `requireRoleOrPermission` / session type and use the real role check (do not invent fields).

- [ ] **Step 4: Employee edit banner**

Extend `searchParams` with `hired?: string; checklist?: string`. When `hired=1`, show banner: complete profile, send activation when ready; if `checklist=0`, mention configuring onboarding template / starting checklist manually.

- [ ] **Step 5: Manual E2E**

1. Open requisition → add candidate → advance to offer → create offer → accept as HR → land on employee edit with banner; confirm checklist tasks exist if template present.  
2. Confirm activation was not auto-sent.  
3. If possible, accept as recruiter-only and confirm success message without Unauthorized.

- [ ] **Step 6: Run recruitment tests**

Run: `pnpm exec vitest run tests/recruitment/`

- [ ] **Step 7: Commit (only if user asked)**

---

### Task 8: Spec success checklist + docs touch

**Files:**
- Modify: `docs/features.md` §15 only if it claims incomplete items that this ships (short factual update)
- Modify: `docs/superpowers/specs/2026-11-11-recruitment-enterprise-desk-design.md` success criteria checkboxes when done

- [ ] **Step 1: Walk spec §10 success criteria against the running app**
- [ ] **Step 2: Update features.md recruitment bullet if needed (no marketing fluff)**
- [ ] **Step 3: Mark design success criteria `[x]` when verified**
- [ ] **Step 4: Commit (only if user asked)**

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Requisition hub filters + dept/branch/type + open/hold/close | Tasks 2–3 |
| Candidate detail + notes + withdraw + source | Tasks 4–5 |
| Slim board | Task 5 |
| Offer draft/sent/accept/decline/withdraw + PDF + currency | Tasks 1, 6–7 |
| Accept → draft employee + checklist soft-start; activation manual | Task 7 |
| Recruiter-safe landing | Task 7 |
| No public careers | Global constraint / no task adds routes |

No TBDs in task steps. Offer email and signed upload remain deferred per spec §11.
