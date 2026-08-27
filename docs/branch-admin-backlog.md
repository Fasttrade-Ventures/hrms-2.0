# Branch Admin parity backlog

Branch-scoped surfaces shipped in the Aug 2026 remediation:

| Feature | Route |
| --- | --- |
| Documents (+ upload) | `/branch-admin/documents` |
| Document compliance | `/branch-admin/documents/compliance` |
| Calendar | `/branch-admin/calendar` |
| Apply on behalf | `/branch-admin/apply-behalf` (+ `/new`, `/leave/[id]`, `/late/[id]`) |
| Reports | `/branch-admin/reports` (+ selected slugs) |
| Employees | `/branch-admin/employees` |

## Remaining enhancements

- [x] Branch report catalog subset UI (hide asset-register + performance-snapshot in hub; slug page already allowlisted)
- [x] Apply-behalf detail pages under `/branch-admin/apply-behalf/leave|late/[id]`
- [x] Document upload + compliance matrix for branch admins (branch-scoped employee picker)
- [x] Multi-branch admins — `organization_membership_branches` + `branchIds` scope (falls back to employee home branch when junction empty)
