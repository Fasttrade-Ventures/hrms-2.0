# HRMS — Full feature list

Complete product feature inventory for engineering and stakeholders.  
Cross-check UI screens in [ui-design-inventory.md](./ui-design-inventory.md).  
Build order and rules in [developer-brief.md](./developer-brief.md).

**Legend**

| Tag | Meaning |
|-----|---------|
| **Core** | Included in base HRMS |
| **Pro** | Professional tier / automation |
| **Ent** | Enterprise tier |
| **UI ✅** | Designed in Pencil |
| **UI 🟡** | Partial design |
| **UI ⬜** | Not designed yet |

---

## 1. Platform & access

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Standalone deployment mode | Core | — | One org, own Supabase + R2 |
| SaaS multi-tenant mode | Core | ✅ Auth/Register | Shared DB, `organization_id` + RLS |
| Login (standalone / SaaS) | Core | ✅ | Desktop + mobile login frames |
| Forgot / reset password | Core | ✅ | |
| Account activation (set password) | Core | ✅ | After HR creates employee |
| Organization registration (SaaS) | Core | ✅ | Hidden in standalone |
| Role-based access (7 roles) | Core | — | Employee, Manager, Branch Admin, HR Admin, Director, Org Owner, Platform Admin |
| Scoped permissions | Core | — | Team / branch / org |
| Specialist permissions | Core | — | Payroll, auditor, asset manager, etc. |
| Module entitlements (Core/Pro/Ent) | Core | — | Server-enforced |
| Audit log | Core | 🟡 HR Audit | Immutable events |
| In-app + email notifications | Core | ✅ Emp/Mgr | Outbox pattern |
| Scheduled jobs ledger | Core | — | Idempotent |
| Private file storage (R2) | Core | — | Signed downloads |
| CSV / print exports | Core | 🟡 | Per module |
| Legacy MySQL + files migration | Core | — | One-time cutover |

---

## 2. Organization & people

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Organizations | Core | — | |
| Branches | Core | ✅ HR Org | CRUD under `/hr/organization/branches` |
| Departments | Core | ✅ HR Org | CRUD under `/hr/organization/departments` |
| Positions / job titles | Core | 🟡 HR Org | Free-text `job_title` on employees for now |
| Shifts | Core | ✅ HR Org | CRUD under `/hr/organization/shifts` |
| Public holidays / observed holidays | Core | ✅ HR Org | Managed under `/hr/organization/holidays`; Calendar consumes |
| Reporting relationships (manager → team) | Core | — | Drives manager scope |
| **HR create employee** | Core | ⬜ | Not invite; optional activation email |
| Employee CSV bulk create | Core | ⬜ | |
| Employee directory (HR) | Core | ✅ | Polished list |
| Employee profile — Personal | Core | ✅ Emp + HR | |
| Employee profile — Address | Core | ✅ Emp + HR | |
| Employee profile — Emergency contact | Core | ✅ Emp + HR | |
| Employee profile — Employment | Core | ✅ Emp (RO) / HR (edit) | Role, branch, status, join date |
| Employee profile — Bank & statutory | Core | ✅ Emp (RO) / HR (edit) | EPF, SOCSO, tax, bank |
| Employee profile — Security | Core | ✅ | Change / reset password |
| Family / dependents data | Core | ⬜ | For payroll tax categories |
| Compensation / salary profile | Core | ⬜ | Feeds payroll |
| Deactivate / employment status | Core | 🟡 | On employment tab |

---

## 3. Leave

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Leave types & entitlements | Core | ✅ HR Org | CRUD under `/hr/organization/leave-types` |
| Apply leave | Core | ✅ Employee | Half-day / multi-day |
| Working-day calculation | Core | — | Weekends + holidays by branch |
| Leave attachments | Core | — | e.g. MC |
| Leave request detail + timeline | Core | ✅ | Cancel pending |
| Leave balances | Core | ✅ | On dashboards / apply |
| Manager leave approval | Core | ✅ | Detail + confirm |
| HR apply leave on behalf | Core | 🟡 Apply Behalf | |
| Leave cancel / revoke | Core | — | |
| My Calendar (approved leave + holidays) | Core | ✅ | Month / list |
| Team leave (manager) | Core | ✅ + empty | |
| Team calendar (manager) | Core | ✅ + empty | |
| Long-leave escalation | Core | — | |
| Replacement-credit balance on leave | Core | — | Linked to §6 |
| Prorating / carry-forward / expiry | Pro | — | |
| Accrual & reminders | Pro | — | |
| Blackout periods | Pro | — | |
| Configurable multi-level approvals | Pro | — | |

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
| Shift-based lateness rules | Core | — | |
| HR apply attendance on behalf | Core | 🟡 Apply Behalf | |
| GPS / geofencing | Pro | 🟡 overlays designed | |
| Rosters / work schedules | Pro | ⬜ | |
| Overnight shifts | Pro | — | |
| Tardiness alerts | Pro | — | |
| Auto clock-out (idempotent) | Pro | — | |

---

## 5. Claims (expenses / reimbursements)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Submit claim | Core | ✅ | Category, amount (RM), receipt, date |
| Claim history + filters | Core | ✅ + empty | |
| Claim detail + timeline | Core | ✅ | Cancel pending |
| Manager claim approval | Core | ✅ | |
| Payroll payout eligibility | Core | — | After approval |
| Policy limits / mileage / rates | Pro | — | |
| Conditional approval routing | Pro | — | |
| Auto payroll inclusion | Pro | — | |

---

## 6. Overtime

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Apply OT | Core | ✅ | Date, hours, reason |
| OT history | Core | ✅ | |
| OT request detail | Core | ✅ | |
| Manager OT approval | Core | ✅ | |
| OT payout summary → payroll | Core | — | |
| Employee-specific OT rates | Pro | — | |

---

## 7. Replacement credit (claim credit)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Claim credit for weekend / PH work | Core | ✅ | Typically 1.0 day |
| Credit history + empty state | Core | ✅ | |
| Manager approval | Core | ✅ | |
| Balance on leave surfaces | Core | — | |
| Accounting invariants (consume once) | Core | — | |

---

## 8. Payroll (Malaysia)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Pay groups / earning periods | Core | 🟡 HR Payroll | |
| Pay components | Core | — | |
| Absence adjustments | Core | — | |
| Payrun generate / edit | Core | 🟡 | Draft |
| Draft → Locked workflow | Core | ⬜ detail | Locked = immutable |
| Employee payslip list | Core | ✅ | |
| View payslip | Core | ✅ | |
| Bank export | Core | — | |
| Statutory reports | Core | — | |
| EPF (KWSP Third Schedule, effective-dated) | Core | — | |
| SOCSO / EIS (PERKESO schedules) | Core | — | |
| LINDUNG 24 Jam (from Jun 2026) | Core | — | |
| PCB / MTD (LHDN 2026 computerized) | Core | — | |
| HRD Corp levy | Core | — | |
| YTD rules | Core | — | |
| Exact decimal arithmetic | Core | — | No JS floats |
| Scheduled payslip delivery | Pro | — | |
| Payroll anomaly checks | Pro | — | |
| Segregation of payroll duties | Ent | — | |

---

## 9. Documents

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee document vault | Core | ✅ + empty | |
| Required documents | Core | — | |
| HR document administration | Core | 🟡 | |
| Document expiry automation | Pro | — | |
| Generated documents | Pro | — | |

---

## 10. Announcements / company news

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee announcement list | Core | ✅ + empty | |
| Announcement detail + attachment | Core | ✅ | |
| Dashboard latest-N widget | Core | ✅ | |
| HR create / edit / schedule | Core | 🟡 list / ⬜ editor | |

---

## 11. Assets

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| My Assets (assigned to me) | Core | ✅ | Empty when none |
| HR asset register | Core | 🟡 | |
| Assign / return asset | Core | ⬜ | |

---

## 12. Performance / appraisal

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee self-appraisal | Core | ✅ | Period, rating, comments |
| Self-appraisal history | Core | ✅ | |
| Manager team performance list | Core | ✅ | |
| Manager review detail / rating | Core | ✅ | |
| HR appraisal templates / cycles | Core | ⬜ | |
| Advanced KPI cycles | Pro | — | |

---

## 13. Approvals (shared engine)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Unified approval state machine | Core | — | Leave, claim, OT, late, manual att., credit |
| Manager approvals inbox | Core | ✅ + empty | |
| Bulk approve / confirm | Core | ✅ | |
| Approval detail per type | Core | ✅ | Leave, Claim, OT, Late, Replacement |
| Request info / reject / send back | Core | ✅ | Where designed |
| Multi-level / escalation | Pro | — | |
| Custom workflow builder | Ent | — | |

---

## 14. Reports & calendar (org)

| Feature | Tier | UI | Notes |
|---------|------|-----|--------|
| Employee personal calendar | Core | ✅ | Leave-focused |
| HR / org calendar & holiday admin | Core | 🟡 | |
| HR reports hub | Core | 🟡 | CSV/print |
| Scheduled reports | Pro | — | |
| HQ / branch analytics | Ent | — | |

---

## 15. Role portals (shell)

| Portal | Tier | UI | Key capabilities |
|--------|------|-----|------------------|
| Employee | Core | ✅ | Self-service modules above |
| Manager | Core | ✅ | Team + approvals |
| HR Administrator | Core | 🟡 | People, org, payroll ops, assets, audit, news |
| Branch Admin | Core | ⬜ | Branch-scoped ops |
| Director | Core | ⬜ | Org read + approve |
| Organization Owner | Core | ⬜ | Full org, modules, settings |
| Platform Admin | SaaS | ⬜ | Tenant operations only |

---

## 16. Professional & Enterprise add-ons (summary)

### Professional
- Leave accrual, carry-forward, blackouts, reminders, multi-level approvals  
- Attendance rosters, GPS/geofence hardening, overnight shifts, tardiness alerts, auto clock-out  
- Claim/OT policy automation and payroll inclusion  
- Document expiry, onboarding/offboarding checklists  
- Advanced appraisal cycles, scheduled reminders  
- Payroll automation, payslip delivery, anomaly checks  

### Enterprise
- HQ/branch analytics dashboards  
- Recruitment  
- Custom workflow builder  
- SSO  
- External APIs / integrations  
- Advanced retention & compliance controls  
- Payroll duty segregation  

---

## 17. Feature count (approximate)

| Area | Core features (listed rows) |
|------|------------------------------|
| Platform & access | ~18 |
| Org & people | ~20 |
| Leave | ~15 (+ Pro) |
| Attendance | ~12 (+ Pro) |
| Claims / OT / Credit | ~18 (+ Pro) |
| Payroll MY | ~20 (+ Pro/Ent) |
| Docs / News / Assets / Perf | ~15 (+ Pro) |
| Approvals / Reports / Portals | ~15 |
| **Core product surface** | **~130+ capability lines** |

Use this list for backlog grooming; split into tickets per phase in the developer brief.
