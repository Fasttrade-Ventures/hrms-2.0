# Attendance Matrix Design

**Status:** Implemented  
**Route:** `/hr/attendance`  
**Approach:** A — dedicated matrix report; Matrix default + Summary toggle

## Goal

Replace the default Attendance summary rollup with an employee × day timesheet matrix (clearer than legacy HIRIX sheet), keeping Summary + CSV available.

## Data

Per employee × day in filter range:

| Priority | Code | Source |
|----------|------|--------|
| 1 | Leave short code (`AL`, `MC`, …) | Approved leave overlapping day |
| 1 | `HOL` | Org holiday (if no leave) |
| 2 | Hours / late | `attendance_records` with clock-in |
| 3 | `x` | Absent status, no clock-in |
| — | empty | No mark |

Late: show hours with late styling when clocked; else `L`.

## UI

- Sticky employee column + day header; weekend muted; holiday green tint
- Total hrs column; legend; print
- View: Matrix | Summary
- Same ReportFilterBar

## Out of scope

Cell editing, clock-in from grid, branch-admin-only matrix (unless shared later)
