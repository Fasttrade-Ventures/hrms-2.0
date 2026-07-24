# UI design inventory

**Source file:** [`../pencil-new.pen`](../pencil-new.pen)  
**Rule:** implement these frames; if a screen is missing here, get design before coding.

Status legend: ✅ designed · 🟡 partial / needs polish · ⬜ not designed

---

## Shared / Auth ✅

| Frame |
|-------|
| Auth Components |
| Portal Components |
| Auth / Login (Standalone) |
| Auth / Login (SaaS) |
| Auth / Login Mobile (Standalone) |
| Auth / Login Mobile (SaaS) |
| Auth / Register Organization (SaaS) |
| Auth / Forgot Password |
| Auth / Reset Link Sent |
| Auth / Reset Password |
| Auth / Activate Account |

---

## Employee portal ✅

| Frame |
|-------|
| Employee / Dashboard |
| Employee / Dashboard Mobile |
| Employee / Apply Leave |
| Employee / Leave Request Detail |
| Employee / Attendance |
| Employee / Attendance — Clock Success |
| Employee / Attendance — GPS Denied |
| Employee / Attendance — Already Clocked In |
| Employee / Manual Attendance |
| Employee / Report Late |
| Employee / Timesheet |
| Employee / Claims |
| Employee / Claims — Empty |
| Employee / Claim Request Detail |
| Employee / Overtime |
| Employee / OT Request Detail |
| Employee / Replacement Credit |
| Employee / Payslips |
| Employee / View Payslip |
| Employee / Documents |
| Employee / Documents — Empty |
| Employee / Calendar |
| Employee / Announcements |
| Employee / Announcements — Empty |
| Employee / Announcement Detail |
| Employee / Notifications |
| Employee / Notifications — Empty |
| Employee / Profile |
| Employee / Profile — Address |
| Employee / Profile — Security |
| Employee / Change Password |
| Employee / My Assets |
| Employee / Performance |

---

## Manager portal ✅

| Frame |
|-------|
| Manager / Dashboard |
| Manager / Dashboard Mobile |
| Manager / Approvals Inbox |
| Manager / Approvals Inbox — Empty |
| Manager / Approvals Inbox — Bulk Confirm |
| Manager / Approval Detail — Leave |
| Manager / Approval Detail — Claim |
| Manager / Approval Detail — OT |
| Manager / Approval Detail — Late |
| Manager / Approval Detail — Replacement Credit |
| Manager / Approval Detail — Confirm Approve |
| Manager / Approval Detail — Confirm Reject |
| Manager / Team Leave |
| Manager / Team Leave — Empty |
| Manager / Team Attendance |
| Manager / Team Attendance — Empty |
| Manager / Team Calendar |
| Manager / Team Calendar — Empty |
| Manager / Team Performance |
| Manager / Performance Review Detail |
| Manager / Notifications |
| Manager / Profile |
| Manager / Profile — Address |
| Manager / Profile — Employment |
| Manager / Profile — Notifications |
| Manager / Profile — Security |

---

## HR Administrator portal 🟡

### Done

| Frame | Notes |
|-------|--------|
| HR Admin / Dashboard | |
| HR Admin / Employees | List polished (Documents-style) |
| HR Admin / Employee Detail — Personal | |
| HR Admin / Employee Detail — Address | |
| HR Admin / Employee Detail — Emergency | |
| HR Admin / Employee Detail — Employment | HR-editable |
| HR Admin / Employee Detail — Bank | HR-editable statutory/bank |
| HR Admin / Employee Detail — Security | |
| HR Admin / Organization | ✅ Hub + Branches / Departments / Shifts / Holidays / Leave types / Form |
| HR Admin / Apply Behalf | ✅ List (`O5t4X5`) + New form (`mFd4A`, auto-approve leave/late) |
| HR Admin / Documents | |
| HR Admin / Announcements | |
| HR Admin / Calendar | |
| HR Admin / Reports | |
| HR Admin / Payroll | |
| HR Admin / Assets | |
| HR Admin / Audit | |
| HR Admin / Profile | |

### Still needed in Pencil (before / while coding)

| Screen | Notes |
|--------|--------|
| **HR Admin / Create Employee** | Primary flow — **create** employee (not invite); optional activation email |
| Employees — Empty | |
| List polish + empties | Org, Documents, Announcements, Assets, Audit, Payroll, Apply Behalf, Reports |
| Announcement create/edit | HR publish |
| Payroll run detail | Draft → locked |
| Asset assign / detail | |

---

## Other roles ⬜

| Role | Status |
|------|--------|
| Branch Admin | Not designed |
| Director | Not designed |
| Organization Owner | Not designed |
| Platform Admin (SaaS) | Not designed |

---

## Implementation tips

- Match frame **names** to route groups where practical (e.g. `/employee/leave`, `/manager/approvals`, `/hr/employees`).
- Reuse shell: sidebar + topbar + list card + status pill + primary/ghost buttons from Portal/Auth components in Pencil.
- Prefer in-page empty states over dedicated empty routes.
