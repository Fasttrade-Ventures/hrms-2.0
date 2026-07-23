# Legacy PHP module index

Quick reference for parity testing. Paths relative to `hrms-fasttrade/`.

## Auth

`auth/login.php`, `auth/logout.php`, `auth/forgot.php`, `auth/reset_password.php`, `auth/activate.php`

## Employee (`staff/`)

`dashboard.php`, `apply_leave.php`, `history.php`, `my_calendar.php`, `my_attendance.php`, `apply_manual_attendance.php`, `apply_late.php`, `apply_ot.php`, `apply_claim.php`, `replacement_credit.php`, `my_documents.php`, `my_performance.php`, `my_assets.php`, `announcements.php`, `profile.php`, `payslips.php`, `payslip_view.php`

## Manager (`manager/`)

`dashboard.php`, `approvals.php`, `process_leave.php`, `approvals_attendance.php`, `approvals_late.php`, `approvals_ot.php`, `approvals_claims.php`, `approvals_credit.php`, `team_calendar.php`, `performance_review.php`

## Branch admin (`admin/` branch-scoped)

`users.php`, `report_attendance.php`, `report_leave_summary.php`, `apply_behalf.php`, `manage_documents.php`, `manage_announcements.php`

## Director

`director/dashboard.php`, `director/hq_dashboard.php`, `director/branch_comparison.php`, `director/apply_behalf.php`

## HR / super admin (`admin/`)

`company_profile.php`, `branches.php`, `departments.php`, `shifts.php`, `holidays.php`, `leave_types.php`, `bulk_import.php`, `audit_logs.php`, `assets.php`, `payroll_dashboard.php`, `payrun_list.php`, `payrun_generate.php`, `payrun_edit.php`, `payrun_bank_export.php`, `payrun_statutory.php`, `payslips_admin.php`

## API & cron

`api/clock_action.php`, `api/calculate_days.php`, `api/cron_auto_clockout.php`, `api/v1_*.php`, `cron/year_end_process.php`
