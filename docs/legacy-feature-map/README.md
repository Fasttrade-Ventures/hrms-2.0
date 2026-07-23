# Legacy feature map

**Source of truth (read-only):** `hrms-fasttrade`  
**Purpose:** Phase 0 baseline for migration, parity testing, and cutover reconciliation.

See also:

- [schema-drift.md](./schema-drift.md)
- [migration-acceptance-criteria.md](./migration-acceptance-criteria.md)
- [module-index.md](./module-index.md)

## Roles (legacy `roles` table)

| ID | Role | Scope |
|----|------|-------|
| 1 | Staff | Own data |
| 2 | Manager | Team via `users.pic_id` |
| 3 | Director | All branches |
| 4 | Super Admin | Full system |
| 5 | Admin | Own branch |

**New system mapping:** Staff → Employee; Admin → Branch Admin; Super Admin → HR Administrator + Organization Owner split; Director retained; Platform Administrator is SaaS-only (no legacy equivalent).

## MySQL tables (36)

### Identity & org

| Table | Purpose |
|-------|---------|
| `roles` | Role catalog |
| `users` | Employee master + auth + compensation + statutory |
| `branches` | Locations, weekend mode, geo-fence, cut-off |
| `departments` | Departments per branch |
| `shifts` | Shift definitions |
| `user_family` | Dependents (tax relief) |
| `user_emergency` | Emergency contacts |
| `password_reset_tokens` | Password reset tokens |

### Leave

| Table | Purpose |
|-------|---------|
| `leave_types` | Leave catalog |
| `leave_requests` | Applications + approvals |
| `user_leave_access` | Per-user leave type access |
| `holidays` | Public/company holidays |
| `replacement_credits` | Replacement leave credits |

### Attendance & time

| Table | Purpose |
|-------|---------|
| `attendance` | Clock in/out records |
| `attendance_requests` | Manual attendance corrections |
| `late_requests` | Late arrival reports |
| `overtime_requests` | OT applications |

### Claims & assets

| Table | Purpose |
|-------|---------|
| `claim_types` | Claim categories |
| `claims` | Expense claims |
| `assets` | Assigned company assets |

### Documents & compliance

| Table | Purpose |
|-------|---------|
| `document_folders` | Folder ACLs |
| `staff_documents` | Employee documents |
| `required_documents` | Mandatory document rules |

### Performance

| Table | Purpose |
|-------|---------|
| `kpi_templates` | KPI templates |
| `review_cycles` | Appraisal periods |
| `performance_appraisals` | Self/manager reviews |

### Payroll (Enterprise)

| Table | Purpose |
|-------|---------|
| `pay_groups` | Pay cycles |
| `payroll_components` | Earning/deduction catalog |
| `payroll_payruns` | Pay run header |
| `payroll_payrun_items` | Per-employee lines |
| `payroll_item_components` | Component breakdown |
| `payroll_payrun_status_log` | Status audit |
| `payroll_settings` | Statutory config |

### Company & audit

| Table | Purpose |
|-------|---------|
| `company_profile` | Company info, module toggles, tier |
| `announcements` | Targeted announcements |
| `audit_logs` | Action audit trail |

## Migration domain groupings

1. **Identity & access** — roles, users, password_reset_tokens
2. **Organization** — branches, departments, shifts, company_profile (org slice)
3. **Leave & calendar** — leave_types, leave_requests, user_leave_access, holidays, replacement_credits
4. **Attendance & time** — attendance, attendance_requests, late_requests, overtime_requests
5. **Claims** — claim_types, claims
6. **Payroll & statutory** — pay_groups, payroll_* tables, payroll_settings
7. **Documents & compliance** — document_folders, staff_documents, required_documents
8. **Performance** — kpi_templates, review_cycles, performance_appraisals
9. **Assets** — assets
10. **Communications** — announcements
11. **Audit & platform** — audit_logs, company_profile (tier/API slice)
12. **Extended profile** — user_family, user_emergency

## Module toggles (`company_profile`)

| Flag | Feature |
|------|---------|
| `module_location` | GPS attendance |
| `module_ot` | Overtime |
| `module_claims` | Claims |
| `module_replacement` | Replacement credits |
| `module_performance` | Performance |
| `module_assets` | Assets |
| `module_documents` | Document vault |
| `module_announcements` | Announcements |
| `module_payouts` | Payout reports |
| `module_audit` | Audit logs |
| `module_import` | Bulk CSV import |
| `api_enabled` | Enterprise REST API |

## QA coverage (legacy)

| Layer | Covered | Not covered |
|-------|---------|-------------|
| PHPUnit | Payroll period, statutory wage base | Leave, attendance, auth, UI |
| Manual smoke | Login, leave, clock-in, approvals | — |
| E2E | — | Full browser automation |
