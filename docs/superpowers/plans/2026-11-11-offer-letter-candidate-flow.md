# Offer letters, templates, and candidate email flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HR letter templates, template-based offer PDFs, Mark-sent email with Accept/Reject links, agreement upload after accept, and HR Confirm hire after signed PDF — plus candidate detail UI polish.

**Architecture:** Org-scoped `hr_letter_templates` + `job_offer_tokens`. Merge-tag renderer feeds `buildSimplePdf`. Mark sent / candidate respond / sign upload use Resend (`packages/platform`) and public token routes. Split today’s combined `acceptOffer` into candidate accept vs HR `confirmHire`. No e-sign vendor.

**Tech Stack:** Next.js App Router (`apps/web`), Zod (`@hrms/validation`), Supabase admin client + migrations, Resend via `@hrms/platform`, Vitest, existing `uploadOrganizationFile` / `buildSimplePdf`.

**Spec:** [`docs/superpowers/specs/2026-11-11-offer-letter-candidate-flow-design.md`](../specs/2026-11-11-offer-letter-candidate-flow-design.md)

## Global Constraints

- Do not push or merge unless the user explicitly asks.
- No DocuSign / drawn e-sign in this plan.
- No public careers portal.
- Activation email stays manual after hire.
- Confirm hire requires `signed_file_id` on the offer.
- Candidate Accept does **not** create the employee; Confirm hire does.
- Prefer existing columns; add migrations only for templates, tokens, and offer `template_id` / agreement file fields as needed.
- Soft-fail email: status can update with a clear resend path.
- Token secrets: store **hash only**; raw token only in email URLs.

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/YYYYMMDDHHMMSS_letter_templates_offer_tokens.sql` | `hr_letter_templates`, `job_offer_tokens`; alter `job_offers` (`template_id`, `agreement_file_id` if needed) |
| `packages/validation/src/letters.ts` (or recruitment) | Zod for templates + offer create/update with templateId |
| `apps/web/src/lib/letters/merge-tags.ts` | Pure merge + tag list |
| `apps/web/src/lib/letters/templates.ts` | CRUD list/get/create/update/deactivate |
| `apps/web/src/lib/letters/render-pdf.ts` | Merge body → `buildSimplePdf` |
| `apps/web/src/lib/recruitment/offer-tokens.ts` | Create/verify/consume tokens |
| `apps/web/src/lib/recruitment/offers.ts` | Create/edit draft from template; markSent+email; split confirmHire; candidate accept/decline handlers |
| `packages/platform/src/mail/*` | Offer sent + agreement to sign email builders + send helpers |
| `apps/web/src/app/(hr)/hr/letters/**` | Template UI + actions |
| `apps/web/src/app/(public)/offer/respond/[token]/page.tsx` | Accept/Reject UI |
| `apps/web/src/app/(public)/offer/sign/[token]/page.tsx` | Download + upload signed PDF |
| `apps/web/src/components/hr/recruitment/candidate-detail.tsx` | Layout polish + new actions |
| `apps/web/src/lib/portal-nav.ts` | Letters nav entry |
| `tests/letters/*.test.ts`, `tests/recruitment/*` | Merge tags, token rules, status guards |

---

### Task 1: Migration + merge-tag helper

**Files:**
- Create: migration for `hr_letter_templates`, `job_offer_tokens`
- Alter: `job_offers` add `template_id uuid null references hr_letter_templates(id)`, `agreement_file_id uuid null references file_objects(id)` (keep `signed_file_id` for signed upload)
- Create: `apps/web/src/lib/letters/merge-tags.ts`
- Create: `tests/letters/merge-tags.test.ts`

**Steps:**

- [ ] **Step 1: Write failing merge-tag tests** (`{{candidate_name}}` replaced; unknown tag left as-is; salary formatting)

- [ ] **Step 2: Implement `applyMergeTags(body, values)`**

- [ ] **Step 3: Write migration SQL** (RLS org policies mirroring other HR tables; indexes on `organization_id`, token hash unique)

- [ ] **Step 4: Run tests** — `pnpm exec vitest run tests/letters/merge-tags.test.ts`

- [ ] **Step 5: Commit only if user asked**

---

### Task 2: Letter template service + `/hr/letters` UI

**Files:**
- Create: `apps/web/src/lib/letters/templates.ts`
- Create: `apps/web/src/app/(hr)/hr/letters/actions.ts`
- Create: pages list/new/edit under `apps/web/src/app/(hr)/hr/letters/`
- Create: `apps/web/src/components/hr/letters/*`
- Modify: `apps/web/src/lib/portal-nav.ts` — Letters for HR admin/owner
- Validation schemas for create/update template

**Steps:**

- [ ] **Step 1: Zod schemas** — name, type enum, body min length, isActive

- [ ] **Step 2: Service** — `listLetterTemplates`, `getLetterTemplate`, `createLetterTemplate`, `updateLetterTemplate`, `listActiveTemplatesByType`

- [ ] **Step 3: UI** — list with type filter; create/edit form showing available merge tags; deactivate

- [ ] **Step 4: Preview** — server action returns merged sample text (no PDF required for preview)

- [ ] **Step 5: Manual check** — create offer + agreement templates as HR

- [ ] **Step 6: Commit only if user asked**

---

### Task 3: Template-based offer create/edit PDF

**Files:**
- Modify: `apps/web/src/lib/recruitment/offers.ts`, `offer-pdf.ts` or `letters/render-pdf.ts`
- Modify: `apps/web/src/app/(hr)/hr/recruitment/actions.ts`
- Modify: `candidate-detail.tsx` create/edit draft forms
- Tests for render with fixture body

**Steps:**

- [ ] **Step 1: `createOfferForApplication` requires `templateId`**; load template; merge; PDF; set `template_id` + `generated_file_id`

- [ ] **Step 2: `updateDraftOffer`** — only if status `draft`; regenerate PDF

- [ ] **Step 3: Wire candidate detail** — template select + edit draft fields

- [ ] **Step 4: Fallback** — if no active offer templates, show empty-state link to `/hr/letters`

- [ ] **Step 5: Commit only if user asked**

---

### Task 4: Mark sent → email + respond token

**Files:**
- Create: `apps/web/src/lib/recruitment/offer-tokens.ts`
- Create: `packages/platform/src/mail/offer-sent.ts` (+ export send helper)
- Modify: `markOfferSent` / actions — create respond token, send email with PDF attachment
- Tests: token hash verify; purpose checks

**Steps:**

- [ ] **Step 1: Token helper** — `createOfferToken({ offerId, purpose, ttlDays: 14 })` returns raw token once; stores hash

- [ ] **Step 2: Email builder** — Accept URL `/offer/respond/{token}?decision=accept`, Reject similarly (or buttons posting decision)

- [ ] **Step 3: Mark sent** — transition to `sent`, email soft-fail with resend action

- [ ] **Step 4: Unit tests** for token consume rules

- [ ] **Step 5: Commit only if user asked**

---

### Task 5: Public respond page (Accept / Reject)

**Files:**
- Create: `apps/web/src/app/(public)/offer/respond/[token]/page.tsx` + actions
- Modify: offers service — `candidateRejectOffer`, `candidateAcceptOffer` (no employee create)

**Steps:**

- [ ] **Step 1: Load token** — invalid/expired/used → friendly page

- [ ] **Step 2: Reject** — offer `declined`; application `rejected` + history; consume token

- [ ] **Step 3: Accept** — offer `accepted`; generate agreement PDF from active employment_agreement template (or template linked at accept time); store `agreement_file_id`; create **sign** token; email agreement; consume respond token

- [ ] **Step 4: If no agreement template** — accept still succeeds; show HR banner “configure agreement template / resend”; do not block accept

- [ ] **Step 5: Manual / smoke** with magic local URL if Resend unset

- [ ] **Step 6: Commit only if user asked**

---

### Task 6: Public sign/upload page

**Files:**
- Create: `apps/web/src/app/(public)/offer/sign/[token]/page.tsx` + upload action
- Use `assertDocumentUpload` + `uploadOrganizationFile`; set `signed_file_id`
- Invalidate sign token on success

**Steps:**

- [ ] **Step 1: Page** — summary (job title, org name), download agreement link, PDF upload

- [ ] **Step 2: Upload action** — verify sign token; store file; set `signed_file_id`

- [ ] **Step 3: Candidate detail** — show Signed badge + download signed PDF for HR

- [ ] **Step 4: Commit only if user asked**

---

### Task 7: Split Confirm hire + gate on signed file

**Files:**
- Modify: `apps/web/src/lib/recruitment/offers.ts` — rename/split: keep employee creation as `confirmHire(offerId, actorUserId)`; require `status === accepted'` and `signed_file_id`
- Modify: actions + candidate-detail — **Confirm hire** button; remove employee creation from candidate-accept path
- Update tests that assumed accept creates employee

**Steps:**

- [ ] **Step 1: Implement `confirmHire`** from current `acceptOffer` body + signed-file guard

- [ ] **Step 2: Update `acceptOfferAction` → `confirmHireAction`** (or keep name but change semantics carefully — prefer rename for clarity)

- [ ] **Step 3: Vitest** for guard: missing signed file throws

- [ ] **Step 4: Commit only if user asked**

---

### Task 8: Candidate detail UI polish

**Files:**
- Modify: `candidate-detail.tsx`, candidate page header
- Status strip: Sent / Awaiting response / Accepted / Awaiting signature / Signed

**Steps:**

- [ ] **Step 1: Layout** — header meta; offer primary; stage compact; timeline below

- [ ] **Step 2: Action visibility** — Mark sent / Resend / Confirm hire / downloads per state

- [ ] **Step 3: Visual pass** on desktop + mobile width

- [ ] **Step 4: Commit only if user asked**

---

### Task 9: Docs + success checklist

**Files:**
- Update spec §10 checkboxes when verified
- Short `docs/features.md` recruitment/letters note
- Note e-sign deferred

**Steps:**

- [ ] **Step 1: Walk success criteria against code**

- [ ] **Step 2: Docs touch**

- [ ] **Step 3: Stop for user review before any push/merge**

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `/hr/letters` templates | 2 |
| Merge tags + PDF | 1, 3 |
| Mark sent email + Accept/Reject | 4, 5 |
| Agreement email + upload | 5, 6 |
| Confirm hire after signed | 7 |
| Candidate detail polish | 8 |
| No e-sign / no careers | Global constraints |
| No push unless asked | Global constraints |

No TBDs in task steps. Resend configuration remains an environment dependency for real email delivery.
