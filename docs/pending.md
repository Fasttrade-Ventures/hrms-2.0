# Pending work

**Updated:** 6 Oct 2026  
**Code baseline:** `main` through PR #35  
**Staff board:** snapshot from the task board on 6 Oct 2026

Staff are already assigned the cards in section 1. Section 2 is still pending and not on that board yet. Section 3 is the later roadmap. Do not assign section 3 until a client asks for it.

---

## 1. Already given to staff

### Pending review

| Card | What it is | Notes |
|------|------------|--------|
| [HR Admin] Positions & Job Titles Catalog | Position list under HR Organization, used on employee create/edit | Code is already on `main` (`/hr/organization/positions`). This card is waiting for review, not a new build. |

### To do

| Card | What it is | Also listed in the product gaps |
|------|------------|----------------------------------|
| Employee - Still Open | Title is too vague to build | Employee portal core is already shipped. Replace this card with a specific gap, or close it. |
| Next Task Phase | Title is too vague to build | Close it or rename it to one item from section 2. |
| [Branch Admin] Apply-on-Behalf for Branch Staff (Claims, OT, Replacements) | Branch admin submits claims, overtime, and replacement credit for staff in their branch | New. Today apply-on-behalf is HR, and mainly leave and late. |
| [HR Admin] Mileage Claims & Custom Employee OT Rates | Mileage rates on claims, and overtime rates set per employee | Product gap: mileage and employee-specific OT rates. |
| [Manager] Multi-Level & Escalation Approval Workflows | More than one approver (manager, then HR, then director) and escalation | Product gap: multi-level approvals, long-leave escalation, conditional routing. Do not tell a client this is live until this card is done. |
| [Manager] Push & In-App Notifications on Cancelled/Revoked Requests | Notify the manager when an employee cancels or revokes a request | In-app notification exists in the leave flow. This card is to confirm push and in-app cover cancel and revoke. |
| [HR Admin] Apply-on-Behalf: Claims, Overtime & Replacement Credit | HR submits claims, overtime, and replacement credit for an employee | Same family as the Branch Admin card. HR version is org-wide. |

### Doing

None.

---

## 2. Still pending, not given to staff yet

Give these out only after the section 1 cards are done. Sequence and boundaries: [pending wave plan](./superpowers/plans/2026-10-06-pending-wave-plan.md). SSO and the marketing site are excluded from this wave.

| # | Item | Why it matters |
|---|------|----------------|
| 1 | Leave-balance reminders | In progress on `feat/leave-balance-reminders`. Daily cron warns when remaining days are 3 or below, or carry-forward leave expires within 30 days. |
| 2 | Probation to confirmation | In progress on `feat/probation-confirmation`. HR sets an end date, gets a reminder within 7 days, and can mark the employee confirmed and download a letter. |
| 3 | Policy / handbook acknowledgment | In progress on `feat/probation-confirmation`. HR publishes a PDF version. Active staff acknowledge that version, and a new version asks again. |
| 4 | Onboarding and offboarding checklists | Built on `feat/probation-confirmation`. HR keeps joiner and leaver templates, starts them on an employee, and ticks tasks on the profile. |
| 5 | Specialist roles | Built on `feat/probation-confirmation`. Recruiter, document custodian, and asset manager open only their HR module. |
| 6 | Custom workflow builder | Still waiting on the staff multi-level approval card. |
| 7 | Advanced KPI cycles | Built on `feat/probation-confirmation`. Templates can hold KPI rows. Employee and manager score them. The rating is the weighted average. |
| 8 | SSO | Only if the client's IT requires company login (SAML / OIDC). |
| 9 | Marketing site | Public website for the product. Not needed to run a client's HRMS. |
| 10 | Pay-first signup and seat hard limits | Seat limit is built. `licensed_headcount` empty means unlimited. Pay-first signup is still later. |
| 11 | Retention beyond the audit archive | Built on `feat/probation-confirmation`. HR can set document and old policy PDF retention. The weekly cron removes those files only. Audit archive is unchanged. |

---

## 3. Later roadmap (do not assign yet)

These are not required for the first RM 12,000 client.

| Group | Items |
|-------|--------|
| Language and Malaysia extras | Bahasa / English toggle, state public-holiday sync, zakat payroll, foreign-worker permit and passport expiry |
| Employee extras | PWA clock, native iOS/Android apps, WhatsApp notifications, shift swap, org chart, birthday and work-anniversary digests, pulse surveys, goals and tasks |
| Letters and money extras | Disciplinary letters (NTE, PIP), e-signature, salary advance, AI letter generator |
| Growth extras | HRDC training academy, public careers site, partner/reseller accounts, selfie attendance, manager AI insights |

---

## 4. Not pending (do not rebuild)

- Positions catalog (in staff review)
- Leave cancel and revoke
- Replacement credit consume-once
- Shift-based lateness
- Overnight shifts, auto clock-out, tardiness alerts
- Leave accrual, carry-forward, and pending-request expiry
- Appraisal templates
- Live in-app notifications
- Malaysian payroll (EPF, SOCSO, EIS, PCB, HRDF), payslips, EA / CP8D
