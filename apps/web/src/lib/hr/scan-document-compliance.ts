import { createAdminClient } from "@/lib/supabase/admin";
import { queueDocumentComplianceNotice } from "@/lib/hr/document-notification-queue";
import {
  documentTypesMatch,
  resolveDocumentCompliance,
  type ComplianceStatus,
} from "@/lib/hr/document-compliance";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

const NOTIFY_STATUSES = new Set<ComplianceStatus>(["missing", "expired", "expiring"]);

export async function scanAndQueueDocumentComplianceNotifications(asOf?: string): Promise<{
  queued: number;
}> {
  const { getEntitlements } = await import("@/lib/entitlements");
  const entitlements = await getEntitlements();
  if (entitlements.tier === "core") {
    return { queued: 0 };
  }

  const organizationId = getOrganizationId();
  const admin = createAdminClient();
  const today = asOf || new Date().toISOString().slice(0, 10);
  let queued = 0;

  const [employeesRes, requiredRes, documentsRes, hrAdminsRes] = await Promise.all([
    admin
      .from("employees")
      .select("id, full_name, email")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    admin
      .from("required_documents")
      .select("name, requires_expiry, warning_days")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    admin
      .from("employee_documents")
      .select("employee_id, document_type, expires_at, created_at, file_objects(deleted_at)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .contains("roles", ["hr_administrator"]),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (requiredRes.error) throw new Error(requiredRes.error.message);
  if (documentsRes.error) throw new Error(documentsRes.error.message);

  const docsByEmployee = new Map<string, Array<{ documentType: string; expiresAt: string | null }>>();
  for (const row of documentsRes.data ?? []) {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    if (file?.deleted_at) continue;
    const list = docsByEmployee.get(row.employee_id) ?? [];
    list.push({ documentType: row.document_type, expiresAt: row.expires_at });
    docsByEmployee.set(row.employee_id, list);
  }

  for (const employee of employeesRes.data ?? []) {
    const { data: membership } = await admin
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("employee_id", employee.id)
      .maybeSingle();

    for (const required of requiredRes.data ?? []) {
      const latest = (docsByEmployee.get(employee.id) ?? []).find((doc) =>
        documentTypesMatch(doc.documentType, required.name),
      );
      const status = resolveDocumentCompliance({
        required: {
          requiresExpiry: required.requires_expiry,
          warningDays: required.warning_days,
        },
        document: latest ? { expiresAt: latest.expiresAt } : null,
        today,
      });

      if (!NOTIFY_STATUSES.has(status)) continue;

      let remainingDays: number | null = null;
      if (status === "expiring" && latest?.expiresAt) {
        const todayMs = Date.parse(`${today}T00:00:00Z`);
        const expiresMs = Date.parse(`${latest.expiresAt}T00:00:00Z`);
        remainingDays = Math.ceil((expiresMs - todayMs) / 86_400_000);
      }

      const statusLabel =
        status === "expiring" ? "expiring soon" : status === "expired" ? "expired" : "missing";

      const payload = {
        employeeName: employee.full_name ?? employee.email ?? "Employee",
        documentType: required.name,
        status,
        expiresAt: latest?.expiresAt ?? null,
        remainingDays,
      };

      if (membership?.user_id) {
        await queueDocumentComplianceNotice({
          organizationId,
          recipientUserId: membership.user_id,
          audience: "employee",
          payload: {
            ...payload,
            subject: `Action needed: ${required.name} is ${statusLabel}`,
            href: "/employee/documents",
          },
          idempotencyKey: `doc-scan-employee:${employee.id}:${required.name}:${status}:${today}`,
        });
        queued += 1;
      }

      for (const hrAdmin of hrAdminsRes.data ?? []) {
        await queueDocumentComplianceNotice({
          organizationId,
          recipientUserId: hrAdmin.user_id,
          audience: "hr",
          payload: {
            ...payload,
            subject: `${employee.full_name ?? "Employee"} — ${required.name} is ${statusLabel}`,
            href: `/hr/documents/library?employeeId=${employee.id}&documentType=${encodeURIComponent(required.name)}`,
          },
          idempotencyKey: `doc-scan-hr:${hrAdmin.user_id}:${employee.id}:${required.name}:${status}:${today}`,
        });
        queued += 1;
      }
    }
  }

  return { queued };
}

export async function syncEmployeeDocumentCompliance(
  organizationId: string,
  employeeId: string,
  userId: string,
  employeeName: string
): Promise<void> {
  const { getEntitlements } = await import("@/lib/entitlements");
  const entitlements = await getEntitlements();
  if (entitlements.tier === "core") {
    return;
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [requiredRes, documentsRes] = await Promise.all([
    admin
      .from("required_documents")
      .select("name, requires_expiry, warning_days")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    admin
      .from("employee_documents")
      .select("document_type, expires_at, created_at, file_objects(deleted_at)")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);

  if (requiredRes.error) throw new Error(requiredRes.error.message);
  if (documentsRes.error) throw new Error(documentsRes.error.message);

  const docs = (documentsRes.data ?? []).filter((row) => {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    return file && !file.deleted_at;
  });

  for (const required of requiredRes.data ?? []) {
    const latest = docs.find((doc) => documentTypesMatch(doc.document_type, required.name));
    const status = resolveDocumentCompliance({
      required: {
        requiresExpiry: required.requires_expiry,
        warningDays: required.warning_days,
      },
      document: latest ? { expiresAt: latest.expires_at } : null,
      today,
    });

    if (status === "missing" || status === "expired" || status === "expiring") {
      const statusLabel =
        status === "expiring" ? "expiring soon" : status === "expired" ? "expired" : "missing";

      const payload = {
        employeeName,
        documentType: required.name,
        status,
        expiresAt: latest?.expires_at ?? null,
      };

      await queueDocumentComplianceNotice({
        organizationId,
        recipientUserId: userId,
        audience: "employee",
        payload: {
          ...payload,
          subject: `Action needed: ${required.name} is ${statusLabel}`,
          href: "/employee/documents",
        },
        idempotencyKey: `doc-scan-employee:${employeeId}:${required.name}:${status}:${today}`,
      });
    }
  }
}
