# Branch Admin parity backlog

Broken deep-links to `/hr/documents` and `/hr/calendar` were removed in the Aug 2026 audit remediation. Branch Admin currently has:

- `/branch-admin/dashboard`
- `/branch-admin/employees` (read-oriented directory; may deep-link into HR employee routes that middleware still allows)

## Suggested future surfaces (branch-scoped)

| Feature | Proposed route | Notes |
| --- | --- | --- |
| Documents | `/branch-admin/documents` | Filter `employees.branch_id` to admin’s branch(es); reuse HR document queries with branch scope |
| Calendar | `/branch-admin/calendar` | Same calendar module; branch filter on events/employees |
| Apply on behalf | `/branch-admin/apply-behalf` | Restrict employee picker to branch; reuse balance/blackout checks |
| Reports | `/branch-admin/reports` | Branch-filtered leave/attendance summaries |

Do not re-enable HR portal links until these pages exist with page-level `requireRole("branch_admin")` and branch filters.
