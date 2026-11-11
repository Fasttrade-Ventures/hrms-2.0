# Recruitment enterprise hiring desk — design

**Date:** 11 Nov 2026  
**Status:** Approved (brainstorm)  
**Product posture:** Internal HRMS hiring desk — not a standalone recruitment platform (e.g. Hirix.AI careers ATS)  
**Related:** [Phase 6 enterprise design §7](./2026-07-28-phase6-enterprise-design.md) · existing module tables in `20260728200000_phase6_enterprise.sql`

---

## 1. Summary

Upgrade BukuHR **Enterprise Recruitment** from a thin requisition + board UI into a complete **internal hiring desk** that ends in a clean people-ops handoff.

| Decision | Choice |
|----------|--------|
| Scope shape | Internal HR workspace + hire → onboarding handoff (Approach 2) |
| Public careers / apply | **Out of scope** |
| Accept offer | Draft employee + **auto-start onboarding checklist**; activation email **manual** |
| Stages | Keep fixed Phase 6 stages (no custom stages) |

**Build on:** existing `job_requisitions`, `job_candidates`, `job_applications`, `job_application_stage_history`, `job_offers`, webhook `recruitment.offer_accepted`, and employee checklist templates.

---

## 2. Goals and non-goals

### Goals

1. Requisition hub that supports real hiring ops (create/edit, filters, open / hold / close).
2. Candidate application detail as the primary work surface (notes, withdraw, source, offer, history).
3. Offer lifecycle that matches DB statuses (draft → sent → accepted | declined | withdrawn) with PDF download.
4. Accept offer creates a draft employee, starts the org onboarding checklist when a template exists, and leaves **Send activation** as an explicit HR step.
5. Recruiter specialists can complete hiring without landing on a dead Unauthorized page after accept.

### Non-goals (this phase)

- Public careers site or candidate self-service apply
- E-signature / DocuSign-style flows
- Customizable stages per org or requisition
- Interview scheduling, scorecards, sourcing integrations
- Bulk email campaigns or required outbound mail for “Mark sent”
- Auto-send activation email on hire

---

## 3. Surfaces

| Route | Purpose |
|-------|---------|
| `/hr/recruitment` | Requisition hub — list, filters, create/edit, lifecycle actions |
| `/hr/recruitment/[requisitionId]` | Compact pipeline board; entry point to candidates |
| `/hr/recruitment/[requisitionId]/candidates/[applicationId]` | Candidate workspace — stage, notes, timeline, offer |
| `/hr/employees/[employeeId]/edit?hired=1` | Draft hire landing for actors who can open employee edit |

Nav and module gate stay as today: Advanced → Recruitment, `requireModule("recruitment")`, roles `hr_administrator` | `organization_owner` or permission `recruiter`.

---

## 4. Requisition hub

### List

- Show title, status badge (`open` | `on_hold` | `closed`), department · branch · employment type, headcount progress (`hired applications / headcount`), open-pipeline count.
- Filters: status, branch, department; text search on title.
- “New requisition” is a secondary action, not the whole page. Empty state only when there are no requisitions.

### Create / edit

Wire fields already on `job_requisitions` / Zod:

- title, description, headcount (1–99)
- employment type: `full_time` | `part_time` | `contract` | `intern`
- optional `department_id`, `branch_id`

Edit allowed while `open` or `on_hold`. Closed requisitions are read-only except **Re-open**.

### Lifecycle

| Action | From → To | Notes |
|--------|-----------|--------|
| Hold | open → on_hold | Board read-only; no new candidates |
| Close | open \| on_hold → closed | Data retained; board viewable; no new candidates / stage advances |
| Re-open | closed → open | Hiring resumes |

No hard delete of requisitions in this phase.

---

## 5. Pipeline and candidate workspace

### Board (`/hr/recruitment/[requisitionId]`)

- Keep eight columns: `applied` → `screening` → `interview` → `assessment` → `offer` → terminal `hired` | `rejected` | `withdrawn`.
- Cards stay light: name, stage age, offer status chip.
- Card click opens candidate detail.
- Quick actions on card: **Advance** and **Reject** only.
- When requisition is `on_hold` or `closed`: read-only board + banner.

### Candidate detail (new page)

`/hr/recruitment/[requisitionId]/candidates/[applicationId]`

- Header: full name, email, phone, source, current stage.
- Stage panel: advance, Reject, Withdraw; optional notes written to `job_application_stage_history`.
- Timeline: history with notes and actor.
- Offer panel: create / manage offer (§6).
- Add candidate (board or hub entry): name, email, phone, **source**. Prefer reuse of existing `job_candidates` row in-org by email when present (avoid duplicate people for the same email).

### Stage rules

- Existing `canMoveToStage`: no exit from terminal stages; no backward moves.
- UI must not offer a stage jump that creates an employee. **Hire only via Accept offer.**
- Creating an offer moves the application to `offer` and **must** insert a stage-history row (fix current gap).

---

## 6. Offers

Statuses (existing): `draft` | `sent` | `accepted` | `declined` | `withdrawn`.

### Create

- Inputs: job title, basic salary, start date.
- Salary display and PDF use **organization currency** (`organizations.currency` / `currencyOrDefault`), not hardcoded `RM`.
- Generate PDF via existing `buildOfferPdf` / `buildSimplePdf`; store file; set `generated_file_id`; status `draft`.

### Lifecycle actions

| Action | Effect |
|--------|--------|
| Mark sent | `status = sent`, set `sent_at`. Outbound email optional later; not required to mark sent. |
| Accept | Hire handoff (§7). Allowed from `draft` or `sent`. |
| Decline | Offer `declined`; application → `rejected` with system/note. |
| Withdraw | Offer `withdrawn`; application → `withdrawn`. |
| Download PDF | Link/open generated file. |

Signed PDF upload (`signed_file_id`) is **deferred** (see §11). Do not block this phase on it.

---

## 7. Hire handoff

On **Accept offer** (single server flow):

1. Create `employees` with `status = 'draft'`, prefill name, email, job title, `join_date` = offer start date, branch/department from requisition, salary on `employee_profiles`.
2. Set offer `accepted` + `accepted_at`; application stage `hired` + `employee_id`; stage history row.
3. **Auto-start onboarding checklist** using the org `checklist_templates` row with `kind = onboarding` and its items (same data path as `startEmployeeChecklist`).
   - If template missing or has zero tasks: hire **still succeeds**; UI banner tells HR to configure the onboarding template.
4. Emit `recruitment.offer_accepted` webhook (existing).
5. **Do not** send activation email automatically.

### Landing / access

- Actors who can open employee edit (`hr_administrator` / owner as today): redirect to `/hr/employees/{id}/edit?hired=1` with banner covering checklist result + “Send activation when profile is ready”.
- Honor `hired=1` on the edit page (today the query param is underused).
- **Recruiter-only** actors: do not dump into Unauthorized. Stay on candidate detail (or a safe recruitment success view) with clear copy that the draft employee was created and HR must complete profile + activation.

### Guards

- Reject second accept if already hired / offer already accepted.
- Stage UI never creates employees.

---

## 8. Access and errors

### Access

| Capability | Who |
|------------|-----|
| Hub, board, candidate, offers, accept | HR admin, org owner, `recruiter` |
| Employee edit, Send activation, checklist toggles | Existing HR admin paths (unchanged) |

### Errors

- Zod validation for new inputs (source, requisition status transitions, offer transitions).
- Checklist auto-start failures are soft (hire commits; banner explains).
- Closed / on_hold requisitions return clear errors if mutations are attempted.

---

## 9. Data and code touchpoints (implementation guide)

Prefer extend-in-place over new tables.

| Area | Likely files |
|------|----------------|
| Validation | `packages/validation/src/recruitment.ts` |
| Services | `apps/web/src/lib/recruitment/*`, checklist start helper extracted or shared from `checklist-service.ts` |
| Actions | `apps/web/src/app/(hr)/hr/recruitment/actions.ts` |
| UI | `apps/web/src/components/hr/recruitment/*`, new candidate detail page under `app/(hr)/hr/recruitment/...` |
| Employee banner | `apps/web/src/app/(hr)/hr/employees/[employeeId]/edit/page.tsx` |
| Tests | Extend `tests/recruitment/*`; add offer transition + accept→checklist coverage |

Schema: use existing columns (`source`, offer statuses, requisition status). Add a migration only if a real gap appears (none expected for the core scope).

---

## 10. Success criteria

- [x] Hub supports create/edit with dept/branch/type and open/hold/close/re-open. (PRs #57–#58)
- [x] Candidate detail is the main work surface; board remains scannable. (PR #60)
- [x] Notes appear on stage history; Withdraw works; source is capturable. (PRs #59–#60)
- [x] Offer draft → sent → accept/decline/withdraw; PDF downloadable; currency from org. (PR #61)
- [x] Accept → draft employee + onboarding checklist attempt; activation remains manual. (PR #62)
- [x] Recruiter accept does not hard-fail into Unauthorized with no success message. (PR #62)
- [x] No public careers routes introduced.

Agent note: criteria verified against merged code + CI; interactive UI smoke in a live HR session was not re-run in the SDD agent session.

---

## 11. Open follow-ups (explicitly deferred)

- Optional notification email when offer marked sent
- Signed offer upload
- Recruiter-safe read-only “new hire summary” page if product later wants specialists to see hire outcome without full employee edit
- Public careers portal (separate product decision)
