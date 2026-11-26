# Create employee API

Use this when another system, such as a hiring tool, needs to add a new employee to BukuHR without someone typing the details in again.

## Setup

1. Sign in as HR or the organization owner.
2. Open **Integrations → Developer API**.
3. Create a key and check **Create employees**. It is not checked by default.
4. Copy the secret immediately. BukuHR shows it once.

The key permission is `employees:write`. Without it the call returns `403`.

## Request

`POST /api/v1/employees`

```
Authorization: Bearer hrms_live_YOUR_KEY
Content-Type: application/json
```

```json
{
  "fullName": "Aina Sofea",
  "email": "aina@example.com",
  "joinDate": "2026-12-01",
  "jobTitle": "Backend Engineer",
  "employmentType": "full_time",
  "basicSalary": "5500.00",
  "icNumber": "950101-14-5678",
  "epfNumber": "12345678",
  "socsoNumber": "950101145678",
  "bankName": "Maybank",
  "bankAccountNumber": "1122334455"
}
```

`fullName`, `email` and `joinDate` (`YYYY-MM-DD`) are required. These optional fields are accepted, with the same rules as the HR create-employee form:

`employeeNumber`, `employmentType`, `jobTitle`, `phone`, `icNumber`, `dateOfBirth`, `gender`, `race`, `religion`, `maritalStatus`, `addressLine1`, `addressLine2`, `city`, `state`, `postcode`, `country`, `payBasis`, `basicSalary`, `bankName`, `bankAccountNumber`, `epfNumber`, `socsoNumber`, `taxNumber`, `sendActivationEmail`.

Any other field is refused with `400`. This includes `portalRole`, `managerEmployeeId`, and branch, department, shift, pay group and position ids. A key that can only create employees cannot grant roles or point at records it does not own. Any login created gets the plain `employee` role.

No activation email is sent unless the body has `"sendActivationEmail": true`. HR decides when staff get a login.

## Responses

| Status | Meaning |
|---|---|
| 201 | Created. `data` has `id`, `employeeNumber` and `activationEmailSent` |
| 400 | Invalid or missing field. `error` names the field |
| 401 | Missing or revoked key |
| 403 | Key lacks Create employees, the subscription is inactive, or the seat limit is reached |
| 409 | An employee with this email or employee number already exists |

Nothing is saved when a call fails.
