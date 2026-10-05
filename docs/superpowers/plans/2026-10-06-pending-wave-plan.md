# Pending wave plan (no SSO, no marketing site)

> **For agentic workers:** Do not start these until the staff board in `docs/pending.md` section 1 is done. Multi-level approvals on that board must ship before the workflow builder. This file is the sequence. Each phase gets its own implementation plan when work starts.

**Goal:** Finish the nine pending items that matter for a corporate HRMS sale, without SSO and without a marketing site.

**Architecture:** Reuse the notification outbox, Vercel crons, employee `confirmation_status`, audit retention columns, and the billing write gate. Add tables only where nothing exists today. One phase, one PR, off `main`.

**Tech Stack:** Next.js App Router, Supabase migrations, Vitest, existing `queueNotification` and `/api/cron/*`.

## Out of this wave

- SSO (SAML / OIDC)
- Marketing site
- Bahasa, WhatsApp, native apps, selfie clock, zakat, salary advance
- Rebuilding positions, leave cancel/revoke, accrual, or appraisal templates

## Order

| Phase | Item | Start when | Who |
|-------|------|------------|-----|
| 1 | Leave-balance reminders | Opened on `feat/leave-balance-reminders` | Staff |
| 2 | Probation to confirmation | Opened on `feat/probation-confirmation` | Staff |
| 3 | Policy acknowledgment | Opened on `feat/probation-confirmation` | Staff |
| 4 | Onboarding and offboarding checklists | Opened on `feat/probation-confirmation` | Staff |
| 5 | Specialist roles | Opened on `feat/probation-confirmation` | Staff |
| 6 | Seat hard limit | Opened on `feat/probation-confirmation` | Staff, with the license number from you |
| 7 | Custom workflow builder | Only after the staff multi-level approval card is merged | Staff |
| 8 | Advanced KPI cycles | Opened on `feat/probation-confirmation` | Staff |
| 9 | Retention beyond the audit archive | Opened on `feat/probation-confirmation` | Staff |

Pay-first signup is not a phase. Standalone clients pay by invoice. The seat limit in phase 6 is what protects the RM 12,000 license. Pay-first stays a later SaaS-only change to `apps/web/src/lib/billing/subscription-gate.ts`.

---

### Phase 1: Leave-balance reminders

**Done when:** A daily cron notifies an employee in-app when a leave balance will expire within 30 days, or remaining days drop to 3 or below. One notification per employee per leave type per month.

**Reuse:** `apps/web/src/lib/leave/rollover.ts`, `apps/web/src/lib/notifications/queue.ts`, `apps/web/vercel.json`.

**Add:**

- `apps/web/src/lib/leave/balance-reminders.ts`
- `apps/web/src/app/api/cron/leave-balance-reminders/route.ts`
- `tests/leave/balance-reminders.test.ts`
- Cron entry in `apps/web/vercel.json` at `0 1 * * *` (same hour pattern as the other Malaysia-aligned crons)

**Do not:** Change how balances are calculated. Do not email unless the in-app row is written first.

**Test:** `pnpm exec vitest run tests/leave/balance-reminders.test.ts`

---

### Phase 2: Probation to confirmation

**Done when:** HR sets a probation end date. Seven days before that date, HR gets an in-app reminder. HR can mark the employee confirmed, which sets `confirmation_status` to `confirmed` and stores the confirmation date. A simple confirmation letter PDF can be downloaded.

**Reuse:** `confirmation_status` already written in `apps/web/src/lib/employees/create-employee.ts` and `update-employee.ts`. Labels in `apps/web/src/lib/employees/display-labels.ts`.

**Add:**

- Migration: `employees.probation_end_date date`, `employees.confirmed_on date`
- `apps/web/src/lib/employees/probation.ts`
- `apps/web/src/app/api/cron/probation-reminder/route.ts`
- Confirmation action on the HR employee edit screen
- `tests/unit/probation-reminder.test.ts`

**Do not:** Build a letter template designer. One fixed PDF is enough.

**Test:** `pnpm exec vitest run tests/unit/probation-reminder.test.ts`

---

### Phase 3: Policy acknowledgment

**Done when:** HR publishes a policy (title, version, PDF). Employees with status active see it until they acknowledge that version. A new version asks them to acknowledge again. HR can see who has not acknowledged.

**Add:**

- Migration: `policies`, `policy_acknowledgements`
- `apps/web/src/lib/policies/acknowledgements.ts`
- HR page `/hr/policies`
- Employee page `/employee/policies`
- Nav entries in `apps/web/src/lib/portal-nav.ts`
- `tests/unit/policy-acknowledgement.test.ts`

**Do not:** E-signature, drawing a signature, or WhatsApp.

**Test:** `pnpm exec vitest run tests/unit/policy-acknowledgement.test.ts`

---

### Phase 4: Onboarding and offboarding checklists

**Done when:** HR has two lists, joiner and leaver. Each item is a task with an owner and a done tick. Starting onboarding creates tasks for that employee. HR sees open tasks on the employee profile.

**Add:**

- Migration: `checklist_templates`, `checklist_template_items`, `employee_checklist_tasks`
- `apps/web/src/lib/employees/checklists.ts`
- HR UI under `/hr/employees/[employeeId]`
- `tests/unit/employee-checklists.test.ts`

**Do not:** A public careers site or an automated account deactivation on the last leaver tick. Deactivation stays the existing employee status action.

**Test:** `pnpm exec vitest run tests/unit/employee-checklists.test.ts`

---

### Phase 5: Specialist roles

**Done when:** An org can grant `recruiter`, `document_custodian`, or `asset_manager` without making that person a full HR administrator. Each role only reaches its module.

**Reuse:** The permission pattern already used for `payroll_processor`, `payroll_approver`, and `auditor` in `apps/web/src/lib/auth/`.

**Add:**

- Allow those three permission strings on membership
- Gate recruitment, document admin, and asset admin routes with the matching permission
- `tests/unit/specialist-permissions.test.ts`

**Do not:** New portals. These people still sign in through the HR portal, with a shorter menu.

**Test:** `pnpm exec vitest run tests/unit/specialist-permissions.test.ts`

---

### Phase 6: Seat hard limit

**Done when:** The org has `licensed_headcount`. Creating or reactivating an employee fails when active employees are already at that number. The error tells HR how many seats are licensed.

**Reuse:** Employee create in `apps/web/src/lib/employees/create-employee.ts`.

**Add:**

- Migration: `organizations.licensed_headcount integer` (null means unlimited, so current demo orgs do not break)
- Check inside create and status-change to `active`
- `tests/unit/seat-limit.test.ts`

**Rule for the RM 12,000 deal:** set `licensed_headcount` to the staff count on the quote (50 if they bought the floor). Do not turn on pay-first.

**Test:** `pnpm exec vitest run tests/unit/seat-limit.test.ts`

---

### Phase 7: Custom workflow builder

**Start only after** the staff card "Multi-Level & Escalation Approval Workflows" is merged. That card teaches the approval engine to run more than one step. This phase is the screen where HR defines those steps without a developer.

**Done when:** HR can save a workflow for one request type (leave first) with up to 3 ordered steps: manager, HR, or a named employee. New leave requests use that workflow. Claims, overtime, and the others stay on the single manager step until a later PR.

**Reuse:** `approval_steps` and `apps/web/src/lib/approvals/service.ts`.

**Do not:** A drag-and-drop canvas, conditions like "amount over RM 500", or a second engine beside the one the multi-level card adds.

**Test:** `pnpm exec vitest run tests/unit/workflow-builder.test.ts` once that file is added with the phase.

---

### Phase 8: Advanced KPI cycles

**Done when:** An appraisal template can include KPI rows (name, weight, target). A cycle launched from that template asks the employee and manager to score each KPI. The overall rating is the weighted average.

**Reuse:** `apps/web/src/lib/hr/performance-templates.ts` and `/hr/performance/templates`.

**Do not:** Goals outside appraisals, OKR trees, or a separate tasks module.

**Test:** `pnpm exec vitest run tests/performance/kpi-scores.test.ts`

---

### Phase 9: Retention beyond the audit archive

**Done when:** HR can set how long three kinds of records are kept: audit logs (already `organizations.audit_retention_days`, default 2555), employee documents, and acknowledged policies. A cron deletes or archives only documents and policy files past their own retention. Audit archive behaviour in `apps/web/src/lib/audit/jobs/archive.ts` stays as it is.

**Do not:** A new SIEM product. Do not delete audit rows inside the current retention window.

**Test:** `pnpm exec vitest run tests/unit/record-retention.test.ts`

---

## What you do while staff build phase 1

- Close or rename the vague cards "Employee - Still Open" and "Next Task Phase".
- Do not sell multi-level approvals or the workflow builder as live.
- Write the licensed headcount into the client contract so phase 6 has a number to enforce.
