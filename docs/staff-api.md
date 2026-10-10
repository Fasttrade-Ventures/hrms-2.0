# Staff self-service API

Use this when another system needs to do what a staff member can do in the employee portal: apply for leave, cancel that leave, submit a claim, request overtime, ask to fix a missed clock time, and read remaining leave and locked payslips.

One API key covers all of these, plus clock in and clock out. Create the key on **Integrations → Developer API** and leave **Staff self-service** checked. Clock attendance is included in that permission. You do not need a separate key for each call.

The same instructions are on the Developer API screen. This file is the copy for the repo.

The API key is required. These routes are not open without a key.

Payroll lock, deleting staff, and writing bank or salary stay inside BukuHR. This API does not do those.

---

## Setup

1. Sign in as HR or the organization owner.
2. Open **Integrations → Developer API**.
3. Create a key and leave **Staff self-service** checked.
4. Copy the secret immediately. BukuHR shows it once.
5. Store the secret on the other system. Do not put it in a public web page.

The key permission is `staff:self`. A key without that permission gets `403` on the calls below. A key that only has `attendance:clock` can still clock in and out, and cannot apply leave or submit a claim.

Enterprise includes the API module. The Developer API screen is behind that module.

---

## Base URL and authentication

```
https://your-bukuhr-host/api/v1
```

```
Authorization: Bearer hrms_live_YOUR_KEY
```

`X-API-Key: hrms_live_YOUR_KEY` also works. Send `Content-Type: application/json` on POST calls.

Identify the person with `employeeNumber` or `email` on every call except cancel. The person must already be an active employee in this organization, and must already have a BukuHR login. The request still goes to their manager for approval. Blackout dates, leave balance, overlapping leave, and claim limits are the same rules as the employee portal.

---

## Apply for leave

`POST /api/v1/leave-requests`

```json
{
  "employeeNumber": "E001",
  "leaveTypeId": "uuid-of-the-leave-type",
  "startDate": "2026-10-20",
  "endDate": "2026-10-21",
  "halfDay": false,
  "reason": "Family event"
}
```

Success is **201**. `data.id` is the leave request id. Use that id to cancel.

| Status | Meaning |
|---|---|
| 201 | Submitted for approval |
| 400 | Missing fields, blackout, or not enough leave balance |
| 403 | Key lacks Staff self-service, or the subscription is inactive |
| 404 | No active employee with that number or email |
| 409 | Another pending or approved leave already covers these dates |

---

## Cancel that leave

`POST /api/v1/leave-requests/{id}/cancel`

```json
{ "reason": "Plans changed" }
```

Only a pending request can be cancelled. The manager is notified. Success is **200**.

| Status | Meaning |
|---|---|
| 200 | Cancelled |
| 403 | Key lacks Staff self-service, or the subscription is inactive |
| 404 | No leave request with that id in this organization |
| 409 | The request is already approved, rejected, or cancelled |

---

## Submit a claim

`POST /api/v1/claims`

```json
{
  "employeeNumber": "E001",
  "claimTypeId": "uuid-of-the-claim-type",
  "amount": "45.00",
  "receiptDate": "2026-10-10",
  "description": "Client lunch"
}
```

For a mileage claim type, send `distanceKm`, `origin`, and `destination`. BukuHR calculates the amount from the claim type’s rate per km. Do not send a receipt file on this call. Success is **201**.

Claims are available on Professional and Enterprise. A Core organization gets **403**.

---

## Request overtime

`POST /api/v1/overtime`

```json
{
  "employeeNumber": "E001",
  "workDate": "2026-10-10",
  "hours": 2,
  "rateType": "1.5",
  "reason": "Month-end close"
}
```

`rateType` is `1.5`, `2.0`, or `3.0`. It defaults to `1.5`. Hours must be greater than 0 and no more than 24. Success is **201**.

Overtime is available on Professional and Enterprise.

---

## Fix a missed clock time

`POST /api/v1/attendance/manual`

This does not change the attendance record immediately. It asks a manager to approve the correction.

```json
{
  "employeeNumber": "E001",
  "requestDate": "2026-10-10",
  "clockInTime": "09:00",
  "clockOutTime": "18:00",
  "reason": "Forgot to clock in"
}
```

Success is **201**.

Clock in and clock out from a virtual office are separate calls. See `docs/attendance-api.md`.

---

## Remaining leave

`GET /api/v1/leave-balances?employeeNumber=E001`

`email` works in place of `employeeNumber`. Success is **200**. Each item has `leaveTypeId`, `leaveTypeName`, `entitlementDays`, `usedDays`, `pendingDays`, and `remainingDays`.

---

## Payslips

`GET /api/v1/payslips?employeeNumber=E001`

Returns locked payslips only. Each item has `periodLabel`, `grossPay`, `netPay`, `epfEmployee`, `socsoEmployee`, `eisEmployee`, and `pcb`. Draft or unlocked pay runs are not included.

Payslips are available on Professional and Enterprise.

---

## OpenAPI

`GET /api/v1/openapi.json` lists these paths with the attendance and read endpoints.
