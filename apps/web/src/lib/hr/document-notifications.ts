import { createAdminClient } from "@/lib/supabase/admin";
import { buildComplianceMatrix } from "@/lib/hr/documents";
import { queueDocumentComplianceNotice } from "@/lib/hr/document-notification-queue";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function queueDocumentComplianceNotifications(input: {
  employeeId: string;
  documentType: string;
}): Promise<void> {
  const organizationId = getOrganizationId();
  const matrix = await buildComplianceMatrix();
  const employeeRow = matrix.find((row) => row.employeeId === input.employeeId);
  if (!employeeRow) return;

  const cell = employeeRow.cells.find(
    (item) => item.requiredDocumentName.toLowerCase() === input.documentType.toLowerCase(),
  );
  if (!cell || (cell.status !== "missing" && cell.status !== "expired" && cell.status !== "expiring")) {
    return;
  }

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("full_name, email")
    .eq("id", input.employeeId)
    .maybeSingle();

  const { data: employeeMembership } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", input.employeeId)
    .maybeSingle();

  const { data: hrAdmins } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .contains("roles", ["hr_administrator"]);

  const statusLabel =
    cell.status === "expiring" ? "expiring soon" : cell.status === "expired" ? "expired" : "missing";

  const payload = {
    employeeName: employee?.full_name ?? "Employee",
    documentType: input.documentType,
    status: cell.status,
    expiresAt: cell.expiresAt,
    subject: `Action needed: ${input.documentType} is ${statusLabel}`,
    href:
      cell.status === "missing" || cell.status === "expired"
        ? "/employee/documents"
        : "/hr/documents/compliance",
  };

  if (employeeMembership?.user_id) {
    await queueDocumentComplianceNotice({
      organizationId,
      recipientUserId: employeeMembership.user_id,
      audience: "employee",
      payload: {
        ...payload,
        subject: `Action needed: ${input.documentType} is ${statusLabel}`,
      },
      idempotencyKey: `doc-compliance-employee:${input.employeeId}:${input.documentType}:${cell.status}`,
    });
  }

  for (const hrAdmin of hrAdmins ?? []) {
    await queueDocumentComplianceNotice({
      organizationId,
      recipientUserId: hrAdmin.user_id,
      audience: "hr",
      payload: {
        ...payload,
        subject: `${employee?.full_name ?? "Employee"} — ${input.documentType} is ${statusLabel}`,
        href: `/hr/documents/library?employeeId=${input.employeeId}&documentType=${encodeURIComponent(input.documentType)}`,
      },
      idempotencyKey: `doc-compliance-hr:${hrAdmin.user_id}:${input.employeeId}:${input.documentType}:${cell.status}`,
    });
  }
}
