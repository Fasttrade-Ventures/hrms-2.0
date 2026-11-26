import { createEmployeeSchema } from "@hrms/validation";

import { createEmployeeRecord, type CreateEmployeeResult } from "@/lib/employees/create-employee";

export class EmployeeApiValidationError extends Error {}

/**
 * Fields an API key may set. Everything else is refused rather than ignored.
 *
 * Deliberately absent: `portalRole` (would let a write-only key mint an HR
 * administrator login), `managerEmployeeId` (promotes an existing employee to
 * manager), and the branch/department/shift/pay-group/position ids, which are
 * not checked against the caller's organization.
 */
export const EMPLOYEE_API_FIELDS = [
  "fullName",
  "email",
  "employeeNumber",
  "joinDate",
  "employmentType",
  "jobTitle",
  "phone",
  "icNumber",
  "dateOfBirth",
  "gender",
  "race",
  "religion",
  "maritalStatus",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postcode",
  "country",
  "payBasis",
  "basicSalary",
  "bankName",
  "bankAccountNumber",
  "epfNumber",
  "socsoNumber",
  "taxNumber",
  "sendActivationEmail",
] as const;

const ALLOWED = new Set<string>(EMPLOYEE_API_FIELDS);

/**
 * Creates an employee on behalf of an API key.
 *
 * Unlike the HR form, no activation email goes out unless the caller asks for
 * one with `sendActivationEmail: true`, and any login created gets the plain
 * `employee` role.
 */
export async function createEmployeeFromApi(
  organizationId: string,
  body: Record<string, unknown>,
): Promise<CreateEmployeeResult> {
  const rejected = Object.keys(body).filter((key) => !ALLOWED.has(key));
  if (rejected.length > 0) {
    throw new EmployeeApiValidationError(
      `${rejected.join(", ")}: not accepted by this endpoint. See the Create employees docs for the allowed fields.`,
    );
  }

  const prepared: Record<string, unknown> = {
    sendActivationEmail: false,
    ...body,
    portalRole: "employee",
  };
  if (typeof prepared.email === "string") prepared.email = prepared.email.trim().toLowerCase();

  const parsed = createEmployeeSchema.safeParse(prepared);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "body";
    throw new EmployeeApiValidationError(`${field}: ${issue?.message ?? "Invalid value."}`);
  }

  return createEmployeeRecord(parsed.data, null, { organizationId, source: "api" });
}

export function employeeApiErrorStatus(error: unknown): number {
  if (error instanceof EmployeeApiValidationError) return 400;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("already exists")) return 409;
  if (message.startsWith("Subscription inactive") || message.includes("is licensed for")) return 403;
  return 500;
}
