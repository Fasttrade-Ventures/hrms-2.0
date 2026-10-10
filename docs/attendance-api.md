# Attendance API

Use this when another system, such as a virtual office, needs to clock staff in BukuHR. That system keeps its own login. BukuHR only receives the clock call.

The same instructions are on **Integrations → Developer API** inside the app. This file is the copy for the repo.

The API key is required. These routes are not open without a key.

---

## Setup

1. Sign in as HR or the organization owner.
2. Open **Integrations → Developer API**.
3. Create a key and leave **Clock attendance** checked.
4. Copy the secret immediately. BukuHR shows it once.
5. Store the secret on the other system. Do not put it in a public web page.

The key permission is `attendance:clock`. A key without that permission gets `403`.

Enterprise includes the API module. The Developer API screen is behind that module.

---

## Base URL

```
https://your-bukuhr-host/api/v1
```

The live host is `NEXT_PUBLIC_SITE_URL` plus `/api/v1`. The Developer API screen prints the exact base URL for that install.

---

## Authentication

Send the secret on every request.

```
Authorization: Bearer hrms_live_YOUR_KEY
```

or

```
X-API-Key: hrms_live_YOUR_KEY
```

| Status | Meaning |
|---|---|
| 401 | Missing key, wrong key, or revoked key |
| 403 | Key does not have Clock attendance |

---

## Identify the staff member

The body uses one of these fields. The person must already be an **active** employee in the organization that owns the key.

```json
{ "employeeNumber": "E001" }
```

```json
{ "email": "staff@company.com" }
```

This call does not ask for GPS or a selfie. The saved record has `source` set to `virtual_office`.

---

## Clock in

`POST /api/v1/attendance/clock-in`

```bash
curl -X POST https://your-bukuhr-host/api/v1/attendance/clock-in \
  -H "Authorization: Bearer hrms_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"employeeNumber":"E001"}'
```

Success is **201**:

```json
{
  "data": {
    "id": "uuid",
    "employeeId": "uuid",
    "employeeNumber": "E001",
    "fullName": "Staff name",
    "workDate": "2026-10-10",
    "session": 1,
    "clockInAt": "2026-10-10T01:00:00.000Z",
    "status": "present",
    "source": "virtual_office"
  }
}
```

`status` is `late` when the first session of the day is after the shift start plus grace. Later sessions stay `present`.

| Status | Meaning |
|---|---|
| 201 | Clocked in |
| 400 | No employee number and no email |
| 404 | No active employee with that number or email |
| 409 | Already clocked in |

Call this when the staff member logs into the virtual office.

---

## Clock out

`POST /api/v1/attendance/clock-out`

Same body as clock in. Success is **200**, with `clockOutAt` added.

| Status | Meaning |
|---|---|
| 200 | Clocked out |
| 400 | No employee number and no email |
| 404 | No active employee with that number or email |
| 409 | Not clocked in |

Call this when the staff member leaves the virtual office.

---

## List a day

`GET /api/v1/attendance`

Today, in Asia/Kuala_Lumpur, when `date` is omitted.

```
GET /api/v1/attendance?date=2026-10-10
```

Success is **200**. `data` is a list of sessions. Each item has `employeeNumber`, `fullName`, `email`, `workDate`, `session`, `clockInAt`, `clockOutAt`, `status`, and `source`.

---

## Other calls on the same key

A key can also be allowed to read employees, leave, and payroll. Those are separate checkboxes on the Developer API screen.

**Staff self-service** is one more checkbox. That same key can clock attendance and also apply or cancel leave, submit a claim, request overtime, ask to fix a missed clock time, and read that person’s leave balance and locked payslips. The full list is in `docs/staff-api.md`.

OpenAPI outline: `GET /api/v1/openapi.json`.
