# BukuHR Pencil module screens — design

**Date:** 11 Nov 2026  
**Status:** Approved  
**File:** `untitled.pen` (alongside existing HR Home frame)  
**Constraint:** Visual refresh only of **features that exist today**. No invented product capabilities.

---

## 1. Summary

Six desktop product frames sharing the modern Home shell (forest sidebar, soft mint ground, Manrope/Geist). Content maps 1:1 to current HR routes / nav — richer presentation, not new features.

| Frame | Maps to today |
|-------|----------------|
| People | `/hr/employees` directory |
| Time | `/hr/leave` (primary Time & attendance list; Attendance remains a sibling route — not merged into a new product) |
| Pay | `/hr/payroll` pay runs list |
| Workplace | Content + Talent hubs already in nav (Documents, Letters, Policies, Announcements, Calendar, Assets, Performance, Pulse) |
| Recruitment | `/hr/recruitment` hub + pipeline desk pattern already shipped |
| Analytics | `/hr/analytics` cockpit already shipped |

---

## 2. Shared shell

- Same tokens/sidebar/top bar language as Home.
- Active nav item matches the frame.
- Primary CTAs that already exist: Add employee · (Leave uses existing apply/report actions — no new “Apply leave” product) · New pay run · open a Workplace child · New requisition · Analytics keeps filters/export patterns already on cockpit (no new analytics product).

---

## 3. Per-screen content (current-system only)

### People (`/hr/employees`)
- Stat strip already used on directory (counts).
- Filters / search as today.
- Avatar rows: name, role/dept, status — directory list, not new HRIS modules.

### Time (`/hr/leave`)
- Leave register / report-style table with status chips (as leave ops today).
- Filters + summary stats if the live page already surfaces them.
- Do **not** invent a unified Leave|Attendance tabbed product; Attendance stays separate in real nav.

### Pay (`/hr/payroll`)
- Pay run list with period + status (draft / locked / approved as today).
- Empty / next-action affordances that match existing empty state + “New pay run”.
- No new payroll engines, awards, or STP features.

### Workplace
- Hub cards only for routes that exist: Documents, Letters, Policies, Announcements, Calendar, Assets, Performance, Pulse.
- Short labels; no fake modules (no recognition feed product, no OKRs, etc.).

### Recruitment
- Requisition list or desk: stages, candidate cards, Add candidate — mirrors existing recruitment hub + pipeline.
- No careers site, custom stages, or drag rules beyond what product already allows.

### Analytics
- Period / branch / department filters, KPIs, charts, detail affordance — mirrors analytics cockpit already built.
- No warehouse / new metric inventions beyond existing cockpit domains (workforce, leave, payroll, recruitment).

---

## 4. Non-goals

- Pitch / pricing slides  
- Prices on any frame  
- Mobile layouts  
- Features not in current BukuHR code/nav  
- Implementing these frames in the Next.js app (Pencil only unless asked later)

---

## 5. Success

- Six frames readable next to Home, same brand language.  
- A teammate can point each region to a real route.  
- Nothing on the canvas implies a feature BukuHR does not ship today.
