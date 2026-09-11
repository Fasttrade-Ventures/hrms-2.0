# HRMS — Full feature list

Complete product feature inventory for engineering and stakeholders.  
Cross-check UI screens in [ui-design-inventory.md](./ui-design-inventory.md).  
Build order and rules in [developer-brief.md](./developer-brief.md).

**Last codebase audit:** 2026-08-28 — statuses below reflect implemented routes/libs/schema in `apps/web`, not Pencil alone.  
**Roadmap:** §19–§21 = new planned features (not in code yet). **Competitive:** §22 vs MySyarikat.

**Legend**

| Tag | Meaning |
|-----|---------|
| **Core** | Included in base HRMS |
| **Pro** | Professional tier / automation |
| **Ent** | Enterprise tier |
| **UI ✅** | Designed + implemented (or implemented without Pencil gap noted) |
| **UI 🟡** | Partial design and/or partial implementation |
| **UI ⬜** | Not designed / not implemented yet |
| **—** | Backend / ops capability; no dedicated UI screen |

---

## 1. Platform & access

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Standalone deployment mode | Core | — | One org, own Supabase + R2 |
| SaaS multi-tenant mode | Core | ✅ Auth/Register | Shared DB + RLS; app-layer org resolution + switcher shipped |
| SaaS billing (Billplz) | SaaS | ✅ Owner | `/owner/billing` — plans, invoices, webhook; renewal cron in `vercel.json`; write gate on payroll/HR mutations |
| SaaS marketing site | SaaS | ⬜ | Still FUTURE / out of app |
| Login (standalone / SaaS) | Core | ✅ | Desktop + mobile login frames |
| Forgot / reset password | Core | ✅ | |
| Account activation (set password) | Core | ✅ | After HR creates employee |
| Organization registration (SaaS) | Core | ✅ | Hidden in standalone |
| Role-based access (7+ roles) | Core | — | Employee, Manager, Branch Admin, HR Admin, Director, Org Owner, Platform Admin (+ Auditor portal) |
| Scoped permissions | Core | — | Team / branch / org; multi-branch via `organization_membership_branches` |
| Specialist permissions | Core | 🟡 | Wired: payroll_processor, payroll_approver, auditor; deferred: recruiter, document_custodian, asset_manager, etc. |
| Module entitlements (Core/Pro/Ent) | Core | ✅ Owner | Server-enforced + Owner settings + nav filter |
| Audit log | Core | ✅ | `/hr/audit`, `/auditor/audit`; archive + SIEM crons |
| In-app + email notifications | Core | ✅ Emp/Mgr/HR | Outbox pattern; `/api/cron/notifications` |
| Scheduled jobs (Vercel cron + outbox) | Core | — | Idempotent outbox; see `apps/web/vercel.json` |
| Private file storage (R2) | Core | — | Signed downloads `/api/files/[fileId]/download` |
| CSV / print exports | Core | ✅ | Reports hub + module exports (audit, performance, assets, payroll bank/statutory) |
| Rate limiting | Core | — | `rate_limit_buckets` + RPC |
| Platform impersonation | SaaS / ops | — | Platform admin ops helper |
| Legacy MySQL + files migration | Core | — | CLI `scripts/legacy-import` (one-time cutover) |

---

## 2. Organization & people

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Organizations | Core | — | |
| Branches | Core | ✅ HR Org | CRUD under `/hr/organization/branches` (+ geofence fields) |
| Departments | Core | ✅ HR Org | CRUD under `/hr/organization/departments` |
| Positions / job titles | Core | 🟡 HR Org | Free-text `job_title` on employees — **no positions catalog/CRUD yet** |
| Shifts | Core | ✅ HR Org | CRUD under `/hr/organization/shifts` (`grace_minutes` stored) |
| Public holidays / observed holidays | Core | ✅ HR Org | Managed under `/hr/organization/holidays`; Calendar consumes |
| Reporting relationships (manager → team) | Core | ✅ | `manager_employee_id` on create/edit; drives manager scope |
| **HR create employee** | Core | ✅ | `/hr/employees/create` — optional activation email |
| Employee CSV bulk create | Core | ✅ | `/hr/employees/import` |
| Employee directory (HR) | Core | ✅ | Polished list + status filters |
| Employee profile — Personal | Core | ✅ Emp + HR | |
| Employee profile — Address | Core | ✅ Emp + HR | |
| Employee profile — Emergency contact | Core | ✅ Emp + HR | |
| Employee profile — Employment | Core | ✅ Emp (RO) / HR (edit) | Role, branch, status, join date |
| Employee profile — Bank & statutory | Core | ✅ Emp (RO) / HR (edit) | EPF, SOCSO, tax, bank |
| Employee profile — Security | Core | ✅ | Change / reset password |
| Family / dependents data | Core | ✅ | Create/edit employee + payroll tax categories |
| Compensation / salary profile | Core | ✅ | HR employee payroll section → feeds payroll |
| Deactivate / employment status | Core | ✅ | `active` / `inactive` / `terminated`; deactivate action + directory filters |

---

## 3. Leave

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Leave types & entitlements | Core | ✅ HR Org | CRUD under `/hr/organization/leave-types` |
| Apply leave | Core | ✅ Employee | Half-day / multi-day |
| Working-day calculation | Core | — | Weekends + holidays by branch |
| Leave attachments | Core | ✅ | Upload on apply; download on detail |
| Leave request detail + timeline | Core | ✅ | |
| Leave balances | Core | ✅ | On dashboards / apply; carry-forward field used in balance math |
| Manager leave approval | Core | ✅ | Detail + confirm |
| HR apply leave on behalf | Core | ✅ Apply Behalf | Auto-approved |
| Leave cancel / revoke | Core | ✅ | Cancel pending requests & revoke approved leave on `/employee/leave/[id]` with balance restoration & audit logging |
| My Calendar (approved leave + holidays) | Core | ✅ | Month / list at `/employee/calendar` |
| Team leave (manager) | Core | ✅ + empty | |
| Team calendar (manager) | Core | ✅ | Month / list at `/manager/team-calendar` |
| Long-leave escalation | Core | ⬜ | Not implemented |
| Replacement-credit balance on leave | Core | ✅ | Dynamic balance linked to `replacement_credits` and `replacement_credit_usages` ledgers |
| Prorating / carry-forward / expiry automation | Pro | 🟡 | Manual carry-forward field; **no accrual/expiry jobs** |
| Accrual & reminders | Pro | ⬜ | |
| Blackout periods | Pro | ✅ HR Org | `leave_blackout_periods` + apply/behalf enforcement |
| Configurable multi-level approvals | Pro | ⬜ | Schema allows steps; runtime always single manager step |

---

## 4. Attendance

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Clock in / out | Core | ✅ | Multi-session capable |
| Clock success / already clocked / GPS denied | Core | ✅ overlays | |
| Attendance history / log | Core | ✅ | Filters, location/IP |
| Live team attendance (manager) | Core | ✅ + empty | |
| Manual attendance request | Core | ✅ | Approval flow |
| Report late | Core | ✅ | Same-day + history |
| Attendance timesheet (month grid / PDF) | Core | ✅ | Codes: hours, AL, MC, HOL, absent, HD |
| Shift-based lateness rules | Core | 🟡 | `grace_minutes` on shifts; clock “Late” badge still hardcoded (~09:00) |
| HR apply attendance on behalf | Core | ✅ Apply Behalf | Late reports auto-approved |
| GPS / geofencing | Pro | ✅ | Branch geofence + outside action; clock enforcement |
| Rosters / work schedules | Pro | ✅ | `/hr/organization/rosters` + `/employee/schedule` |
| Overnight shifts | Pro | ✅ | Cross-midnight sessions; clock-out after midnight stays on the same work date |
| Tardiness alerts | Pro | ⬜ | No notification/cron |
| Auto clock-out (idempotent) | Pro | ⬜ | No job |

---

## 5. Claims (expenses / reimbursements)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Submit claim | Core | ✅ | Category, amount (RM), receipt, date |
| Claim history + filters | Core | ✅ + empty | |
| Claim detail + timeline | Core | ✅ | Cancel pending |
| Manager claim approval | Core | ✅ | |
| Payroll payout eligibility | Core | ✅ | `payroll_treatment` on claim types → payrun feed |
| Policy limits (max amount) | Pro | ✅ | Enforced vs `claim_types.max_amount` |
| Mileage / rates engine | Pro | ⬜ | Not implemented |
| Conditional approval routing | Pro | ⬜ | |
| Auto payroll inclusion | Pro | ✅ | Via claim → payroll feed |

---

## 6. Overtime

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Apply OT | Core | ✅ | Date, hours, reason, rate multiplier |
| OT history | Core | ✅ | |
| OT request detail | Core | ✅ | |
| Manager OT approval | Core | ✅ | |
| OT payout summary → payroll | Core | ✅ | Feed uses request `rate_type` (1.5 / 2.0 / 3.0) |
| Employee-specific OT rates | Pro | ⬜ | Per-request multiplier only |

---

## 7. Replacement credit (claim credit)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Claim credit for weekend / PH work | Core | ✅ | Typically 1.0 day |
| Credit history + empty state | Core | ✅ | |
| Manager approval | Core | ✅ | |
| Balance on leave surfaces | Core | ✅ | Linked dynamically to replacement credits ledger |
| Accounting invariants (consume once) | Core | ✅ | `replacement_credit_usages` ledger with FIFO allocation & restore on cancel/revoke/reject |

---

## 8. Payroll (Malaysia)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Pay groups / earning periods | Core | ✅ HR Payroll | |
| Pay components | Core | ✅ | Settings + seeded catalog |
| Absence adjustments | Core | ✅ | Unpaid leave feed |
| Payrun generate / edit | Core | ✅ | Draft wizard + line edit |
| Draft → Locked workflow | Core | ✅ | Submit, approve, lock |
| Employee payslip list | Core | ✅ | |
| View payslip | Core | ✅ | Component breakdown |
| Bank export | Core | ✅ | CSV, Maybank, CIMB per branch |
| Statutory reports | Core | ✅ | EPF, SOCSO, PCB, HRDF per branch |
| EPF (KWSP Third Schedule, effective-dated) | Core | ✅ | Golden tests |
| SOCSO / EIS (PERKESO schedules) | Core | ✅ | Golden tests |
| LINDUNG 24 Jam (from Jun 2026) | Core | ✅ | Optional ER component |
| PCB / MTD (LHDN 2026 computerized) | Core | ✅ | Golden tests |
| HRD Corp levy | Core | ✅ | Per-branch toggle |
| YTD rules | Core | ✅ | Updated on lock + TP3 opening |
| Exact decimal arithmetic | Core | ✅ | `decimal.js` in domain |
| Scheduled payslip delivery | Pro | ✅ | Cron + `pnpm payroll:payslip-email` |
| Payroll anomaly checks | Pro | ✅ | Flags on payrun items (`detectAnomalies`); limited set / thin review UX |
| Segregation of payroll duties | Ent | ✅ | Org flag + lock checks; Owner settings toggle |
| Payout batches / reconciliation | Ent | ✅ | Enterprise payout tables + payrun payout panel |
| Year-end / EA forms | Core | ✅ | `/hr/payroll/year-end` + PDF generation |

---

## 9. Documents

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee document vault | Core | ✅ | Upload missing/expired required types; download own files |
| Required document types | Core | ✅ HR | CRUD at `/hr/documents/required`; seeded defaults |
| HR document library | Core | ✅ HR | Hub, library, folders, compliance matrix at `/hr/documents/*` |
| Manager team documents (view-only) | Core | ✅ Mgr | `/manager/team-documents`; download direct reports |
| Document expiry notifications | Pro | ✅ | Daily `/api/cron/document-compliance` → outbox (Pro+; skips Core tier) |
| Generated documents | Pro | 🟡 | Employee dossier PDF, payslips, EA/year-end — **not** a general template engine |

---

## 10. Announcements / company news

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee announcement list | Core | ✅ + empty | |
| Announcement detail + attachment | Core | ✅ | |
| Dashboard latest-N widget | Core | ✅ | |
| HR create / edit / schedule | Core | ✅ | `/hr/announcements` compose + schedule + audience; `/api/cron/announcements` |

---

## 11. Assets

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| My Assets (assigned to me) | Core | ✅ | Detail, acknowledge, requests |
| HR asset register | Core | ✅ | Filters, detail, lifecycle |
| Assign / return asset | Core | ✅ | Assignment history + snapshots |
| Asset categories | Core | ✅ | Organization catalog + custom fields |

---

## 12. Performance / appraisal

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee self-appraisal | Core | ✅ | Period, rating, comments |
| Self-appraisal history | Core | ✅ | |
| Manager team performance list | Core | ✅ | |
| Manager review detail / rating | Core | ✅ | |
| HR appraisal cycles | Core | ✅ | `/hr/performance` — create, launch, close, CSV export |
| Reusable appraisal templates | Core | ⬜ | Cycles only — **no template catalog table/UI** |
| Advanced KPI cycles | Pro | ⬜ | |

---

## 13. Approvals (shared engine)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Unified approval state machine | Core | — | Leave, claim, OT, late, manual att., credit |
| Manager approvals inbox | Core | ✅ + empty | |
| Bulk approve / confirm | Core | ✅ | |
| Approval detail per type | Core | ✅ | Leave, Claim, OT, Late, Replacement |
| Request info / reject / send back | Core | ✅ | Where designed |
| Multi-level / escalation | Pro | ⬜ | Always single manager step today |
| Custom workflow builder | Ent | ⬜ | |

---

## 14. Reports, calendar & analytics

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee personal calendar | Core | ✅ | `/employee/calendar` |
| HR / org calendar & holiday admin | Core | ✅ | `/hr/calendar` + holidays at `/hr/organization/holidays` |
| HR reports hub | Core | ✅ | `/hr/reports` — 9 reports, CSV/print, auditor access |
| Scheduled reports | Pro | ✅ | `report_subscriptions` + `/api/cron/report-subscriptions` |
| HQ / branch analytics | Ent | ✅ | `/hr/analytics`, `/director/analytics` |

---

## 15. Recruitment (Enterprise)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Job requisitions | Ent | ✅ | `/hr/recruitment` |
| Candidates / applications pipeline | Ent | ✅ | `/hr/recruitment/[requisitionId]` |
| Offers + offer PDF | Ent | ✅ | Schema + HR flow |

---

## 16. Integrations (Enterprise)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Integrations hub | Ent | ✅ | `/hr/integrations` |
| External API keys + OpenAPI `/api/v1` | Ent | ✅ | `/hr/integrations/api` |
| Outbound webhooks | Ent | ✅ | `/hr/integrations/webhooks` |
| BukuCloud payroll sync | Ent | ✅ | `/hr/integrations/bukucloud` |
| SSO (SAML / OIDC) | Ent | ⬜ | Not implemented |

---

## 17. Role portals (shell)

| Portal | Tier | UI | Key capabilities |
|--------|------|-----|------------------|
| Employee | Core | ✅ | Self-service modules above (+ schedule, notifications) |
| Manager | Core | ✅ | Team + approvals |
| HR Administrator | Core | ✅ | People, org, payroll, docs, news, assets, audit, performance, recruitment, integrations, analytics, reports |
| Branch Admin | Core | ✅ | Documents, compliance, calendar, apply-behalf, employees, reports (`/branch-admin/*`); multi-branch membership |
| Director | Core | ✅ | Dashboard, analytics, reports, payroll read (`/director/*`) — thinner than Manager (no full approvals inbox) |
| Organization Owner | Core | ✅ | Settings, modules/tier packaging, **billing** (`/owner/*`) |
| Platform Admin | SaaS / ops | ✅ | Dashboard health + outbox depths (`/platform/dashboard`); tenants/provision SaaS-only |
| Auditor | Core | ✅ | `/auditor/audit` (specialist permission) |

---

## 18. Professional & Enterprise add-ons (summary)

### Professional — status
| Capability | Status |
|------------|--------|
| Leave blackouts | ✅ Done |
| Leave accrual / carry-forward automation / reminders | 🟡 / ⬜ Partial field only |
| Multi-level leave approvals | ⬜ |
| Attendance rosters + employee schedule | ✅ Done |
| GPS / geofence | ✅ Done |
| Overnight shifts / tardiness alerts / auto clock-out | ⬜ |
| Claim max-amount policy + payroll inclusion | ✅ Done |
| Mileage / richer claim policy | ⬜ |
| Document expiry notifications | ✅ Done |
| Onboarding / offboarding checklists | ⬜ |
| Advanced appraisal / KPI cycles | ⬜ |
| Scheduled payslip delivery | ✅ Done |
| Payroll anomaly flags | ✅ Done |
| Scheduled report subscriptions | ✅ Done |

### Enterprise — status
| Capability | Status |
|------------|--------|
| HQ / branch analytics | ✅ Done |
| Recruitment pipeline | ✅ Done |
| External APIs / webhooks / BukuCloud | ✅ Done |
| Payroll duty segregation | ✅ Done |
| Payout batches / reconciliation | ✅ Done |
| Custom workflow builder | ⬜ |
| SSO | ⬜ |
| Advanced retention & compliance controls | 🟡 Audit archive/SIEM only |

---

## 19. Malaysia ops & compliance (roadmap — NEW)

Differentiator for Malaysian SMEs. **Not implemented yet** (planned).

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Bahasa Malaysia / English UI toggle | Core | ⬜ | Locale switch; PDPA + SME adoption |
| Foreign worker / work permit & passport expiry | Pro | ⬜ | Track expiry + HR/employee alerts |
| Probation → confirmation workflow | Core | ⬜ | Probation end date, reminder, confirmation letter |
| Disciplinary / warning letters (NTE, PIP) | Pro | ⬜ | Generate PDF + employee acknowledgment |
| Policy / handbook acknowledgment | Core | ⬜ | Versioned policies; signed read receipt |
| State public-holiday auto-sync (by negeri) | Core | ⬜ | Seed/sync MY calendar into holidays |
| Salary advance / staff loan + payroll deduction | Pro | ⬜ | Schedule deductions into payrun |
| Zakat payroll option | Pro | ⬜ | Competitive parity (MY payroll) |
| Selfie / face-capture attendance option | Pro | ⬜ | Anti buddy-punch; optional beside GPS |
| Training / HRDC academy module | Ent | ⬜ | Courses, attendance, claimable training records |

---

## 20. Modern employee experience (roadmap — NEW)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| PWA / mobile-first clock | Core | ⬜ | Installable web app; offline-tolerant clock UX |
| Native mobile apps (iOS / Android) | Pro | ⬜ | Competitive parity with MySyarikat App Store / Play / Huawei |
| Push notifications for approvals | Pro | ⬜ | Web push and/or native push |
| WhatsApp notifications | Pro | ⬜ | Approvals, payslip ready (MY channel) |
| Shift swap (employee ↔ employee) | Pro | ⬜ | Manager confirm |
| Org chart visual | Core | ⬜ | From `manager_employee_id` reporting lines |
| Birthday / work anniversary digests | Core | ⬜ | In-app + email/WhatsApp digest |
| Employee pulse / eNPS mini surveys | Pro | ⬜ | Periodic engagement pulse |
| Goal & task tracking | Pro | ⬜ | Lightweight OKR/tasks beside appraisals |

---

## 21. Growth & SaaS moat (roadmap — NEW)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| E-signature on offers / contracts | Ent | ⬜ | Sign + store on recruitment offers / HR letters |
| AI HR letter generator | Pro | ⬜ | Draft → approve → sign → archive (NTE, confirm, warning) |
| Manager AI insights | Pro | ⬜ | Explain patterns (“3 late 4× this week”) — assist, don’t replace |
| Partner / reseller multi-tenant | SaaS | ⬜ | Agencies manage multiple client orgs |
| Public careers / jobs portal | Ent | ⬜ | Brand careers site fed from recruitment |
| Earn-wage / Shariah-compliant advance (GajiNow-class) | Pro | ⬜ | Optional advance product; compliance review required |

---

## 22. Competitive lens — MySyarikat (what they have that we don’t)

Public positioning (2026). Use to prioritize roadmap above — not a claim of full feature parity.

| MySyarikat capability | Our status | Roadmap home |
|----------------------|------------|--------------|
| Native **mobile apps** (iOS / Android / Huawei) | ❌ No native app; web/PWA only | §20 |
| **AI Letter Generator** (create, approve, sign, track HR letters) | ❌ | §21 + §19 disciplinary |
| **GajiNow** — Shariah-compliant earn wage / advance salary | ❌ | §19 salary advance + §21 earn-wage |
| **Training Academy** / HRDC claimable programs | ❌ | §19 Training / HRDC |
| **Public recruitment / jobs portal** | 🟡 Internal recruitment only | §21 Public careers |
| **Smart Attendance** with selfie / swafoto | 🟡 GPS/geofence only | §19 Selfie attendance |
| **LHDN + Zakat** called out in payroll marketing | 🟡 PCB/EPF/SOCSO/EIS/HRDF done; zakat thin/absent | §19 Zakat |
| **Accounting software sync** (marketing) | 🟡 BukuCloud + API/webhooks | Improve integrations |
| **Goal & task tracking** | ❌ | §20 |
| **Weekly product updates** / strong SME GTM + demo motion | 🟡 Product strong; marketing site FUTURE | SaaS marketing |
| BM-first SME UX / local support narrative | 🟡 EN-first today | §19 BM/EN toggle |

**Where we already match or lead (keep sharpening):** MY statutory payroll engine, dual-mode SaaS/standalone, Billplz billing, branch admin, assets, documents compliance, analytics, external API/OpenAPI, audit/SIEM, multi-role portals.

**Beat-them strategy (short):** ship BM/EN + mobile (PWA→native) + HR letters/e-sign + salary advance + selfie attendance — then Training Academy and public jobs portal.

Sources (competitive research, Aug 2026):
- [MySyarikat homepage](https://mysyarikat.com/)
- [MySyarikat HRMS](https://mysyarikat.com/hrms)
- [MySyarikat App Store](https://apps.apple.com/my/app/mysyarikat/id1509750467)
- [GajiNow helpdesk](https://help.mysyarikat.com/en/article/version-20-gajinow-function-in-mysyarikat-website-dtz1qn/)
- [Attendance / OT BM article](https://mysyarikat.com/mysyarikat-kemudahan-pengurusan-kehadiran-dan-ot-pilihan-hr/)

---

## 23. Still pending (open backlog)

### A — Existing product gaps (in code / features above)
1. **Positions catalog** — free-text `job_title` only  
2. **Leave cancel / revoke** — no UI/service  
3. ~~**Replacement credit ↔ leave** consume-once accounting~~ (✅ Implemented via `replacement_credit_usages` ledger)
4. ~~**Shift-based lateness enforcement** — grace unused on clock~~ (✅ Implemented dynamic late detection from shift + grace minutes)  
5. ~~**Overnight shifts**~~ (✅ Cross-midnight sessions stay on shift work date), auto clock-out, tardiness alerts  
6. **Multi-level / custom approval workflows**  
7. **Leave accrual / expiry automation**  
8. **Appraisal templates** (cycles exist)  
9. **Mileage / employee-specific OT rates**  
10. **SSO + marketing site**  
11. **Pay-first signup / seat hard limits** — still FUTURE  

### B — New roadmap (beat MySyarikat) — all ⬜
See §19–§21. Suggested build order:
1. BM/EN + probation/confirmation + policy acknowledgment  
2. PWA clock + WhatsApp/push approvals  
3. Disciplinary letters + e-sign  
4. Salary advance → payroll deduction  
5. Permit/passport expiry + state holiday sync  
6. Selfie attendance + org chart + shift swap  
7. AI letters + manager insights  
8. Training/HRDC + public careers + partner/reseller  

---

## 24. Feature count (approximate)

| Area | Rows |
|------|------|
| Platform & access | ~20 |
| Org & people | ~20 |
| Leave / Attendance | ~30 |
| Claims / OT / Credit | ~18 |
| Payroll MY | ~22 |
| Docs / News / Assets / Perf | ~18 |
| Approvals / Reports / Analytics | ~12 |
| Recruitment / Integrations | ~8 |
| Portals | 8 |
| Malaysia ops roadmap (§19) | ~10 |
| Employee experience roadmap (§20) | ~9 |
| Growth / SaaS moat (§21) | ~6 |
| **Product + roadmap surface** | **~180+ capability lines** |

Use §22–§23 for competitive backlog grooming; ship §19 first for MY SME differentiation.
