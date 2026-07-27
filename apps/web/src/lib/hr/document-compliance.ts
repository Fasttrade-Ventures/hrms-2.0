export type ComplianceStatus = "valid" | "expiring" | "missing" | "expired";

export function resolveDocumentCompliance(input: {
  required: { requiresExpiry: boolean; warningDays: number };
  document: { expiresAt: string | null } | null;
  today: string;
}): ComplianceStatus {
  if (!input.document) return "missing";
  if (!input.required.requiresExpiry) return "valid";
  if (!input.document.expiresAt) return "missing";

  const todayMs = Date.parse(`${input.today}T00:00:00Z`);
  const expiresMs = Date.parse(`${input.document.expiresAt}T00:00:00Z`);
  if (expiresMs < todayMs) return "expired";

  const warningMs = input.required.warningDays * 86_400_000;
  if (expiresMs - todayMs <= warningMs) return "expiring";

  return "valid";
}

export function normalizeDocumentType(value: string): string {
  return value.trim().toLowerCase();
}

export function documentTypesMatch(left: string, right: string): boolean {
  return normalizeDocumentType(left) === normalizeDocumentType(right);
}

export type EmployeeDocumentUploadDecision = "insert" | "replace" | "deny";

export function employeeDocumentUploadDecision(input: {
  existing: { expiresAt: string | null } | null;
  required: { requiresExpiry: boolean; warningDays: number } | null;
  today: string;
}): EmployeeDocumentUploadDecision {
  if (!input.existing) return "insert";

  const status = input.required
    ? resolveDocumentCompliance({
        required: input.required,
        document: { expiresAt: input.existing.expiresAt },
        today: input.today,
      })
    : input.existing.expiresAt &&
        Date.parse(`${input.existing.expiresAt}T00:00:00Z`) < Date.parse(`${input.today}T00:00:00Z`)
      ? "expired"
      : "valid";

  if (status === "expired") return "replace";
  return "deny";
}

export function complianceStatusForUi(status: ComplianceStatus): "valid" | "expiring" | "missing" {
  return status === "expired" ? "missing" : status;
}
