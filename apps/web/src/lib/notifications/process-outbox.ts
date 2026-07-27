import { sendDocumentComplianceEmail } from "@hrms/platform";

import { createAdminClient } from "@/lib/supabase/admin";

export async function processNotificationOutbox(limit = 25): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("notification_outbox")
    .select("id, recipient_user_id, template, payload, status")
    .eq("channel", "email")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);

  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    if (!row.recipient_user_id) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(row.recipient_user_id);
    const email = userData.user?.email;
    if (userError || !email) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    const payload = (row.payload ?? {}) as Record<string, unknown>;
    let result: Awaited<ReturnType<typeof sendDocumentComplianceEmail>> | null = null;

    if (
      row.template === "document_compliance_employee" ||
      row.template === "document_compliance_hr"
    ) {
      result = await sendDocumentComplianceEmail({
        to: email,
        recipientName: String(payload.employeeName ?? "Employee"),
        employeeName: String(payload.employeeName ?? "Employee"),
        documentType: String(payload.documentType ?? "Document"),
        status: String(payload.status ?? "missing"),
        expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : null,
        audience: row.template === "document_compliance_hr" ? "hr" : "employee",
      });
    }

    if (!result) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    if (!result.sent) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    await admin
      .from("notification_outbox")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", row.id);
    sent += 1;
  }

  return { processed: rows?.length ?? 0, sent, failed };
}
