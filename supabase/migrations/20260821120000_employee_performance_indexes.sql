-- Database performance optimization indexes for employee tables
create index if not exists idx_attendance_records_work_date on public.attendance_records (work_date);
create index if not exists idx_leave_requests_employee_status on public.leave_requests (employee_id, status);
create index if not exists idx_approval_requests_requester_status on public.approval_requests (requester_employee_id, status);

-- Additional indexes related to employee queries
create index if not exists idx_attendance_requests_employee_status on public.attendance_requests (employee_id, status);
create index if not exists idx_late_requests_employee_status on public.late_requests (employee_id, status);
create index if not exists idx_overtime_requests_employee_status on public.overtime_requests (employee_id, status);
create index if not exists idx_claims_employee_status on public.claims (employee_id, status);
create index if not exists idx_employees_manager on public.employees (manager_employee_id);
create index if not exists idx_employees_org_status on public.employees (organization_id, status);
