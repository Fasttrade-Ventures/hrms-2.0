import {
  S3R2StorageAdapter,
  StubR2StorageAdapter,
  type R2StorageAdapter,
  sendDocumentComplianceEmail,
  sendPayslipAvailableEmail,
  sendScheduledReportEmail,
} from "@hrms/platform";

import { generatePayslipPdf } from "@/lib/payroll/pdf";
import { createAdminClient } from "@/lib/supabase/admin";

function getStorageAdapter(): R2StorageAdapter {
  try {
    return new S3R2StorageAdapter();
  } catch (err) {
    console.warn("R2 storage not configured, using StubR2StorageAdapter:", err);
    return new StubR2StorageAdapter();
  }
}

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
    } else if (row.template === "payroll.payslip_available") {
      const periodYear = Number(payload.periodYear ?? 0);
      const periodMonth = Number(payload.periodMonth ?? 0);
      const periodLabel =
        periodYear && periodMonth
          ? `${periodYear}-${String(periodMonth).padStart(2, "0")}`
          : "this period";

      let secureLink: string | undefined;
      let attachment: { filename: string; content: string } | undefined;

      if (payload.itemId) {
        const { data: item } = await admin
          .from("payroll_payrun_items")
          .select(`
            id,
            gross_pay,
            net_pay,
            epf_employee,
            epf_employer,
            socso_employee,
            socso_employer,
            eis_employee,
            eis_employer,
            pcb,
            employees (
              full_name,
              employee_number
            )
          `)
          .eq("id", payload.itemId)
          .maybeSingle();

        if (item) {
          const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
          const employeeName = employee?.full_name ?? "Employee";
          const employeeNumber = employee?.employee_number ?? "";

          const pdfBuffer = generatePayslipPdf({
            employeeName,
            employeeNumber,
            periodLabel,
            grossPay: Number(item.gross_pay ?? 0),
            netPay: Number(item.net_pay ?? 0),
            epfEmployee: Number(item.epf_employee ?? 0),
            epfEmployer: Number(item.epf_employer ?? 0),
            socsoEmployee: Number(item.socso_employee ?? 0),
            socsoEmployer: Number(item.socso_employer ?? 0),
            eisEmployee: Number(item.eis_employee ?? 0),
            eisEmployer: Number(item.eis_employer ?? 0),
            pcb: Number(item.pcb ?? 0),
          });

          const adapter = getStorageAdapter();
          const organizationId = String(payload.organizationId ?? process.env.DEFAULT_ORGANIZATION_ID);
          try {
            const ref = await adapter.putObject({
              organizationId,
              category: "payslips",
              fileName: `payslip-${item.id}.pdf`,
              contentType: "application/pdf",
              body: pdfBuffer,
            });

            secureLink = await adapter.getSignedDownloadUrl(ref, { expiresInSeconds: 7 * 24 * 60 * 60 });
          } catch (storageErr) {
            console.error("Failed to upload/sign payslip PDF:", storageErr);
          }

          attachment = {
            filename: `payslip-${periodLabel}.pdf`,
            content: Buffer.from(pdfBuffer).toString("base64"),
          };
        }
      }

      result = await sendPayslipAvailableEmail({
        to: email,
        periodLabel,
        payslipPath: String(payload.href ?? "/employee/payslips"),
        secureLink,
        attachment,
      });
    } else if (row.template === "reports.scheduled") {
      result = await sendScheduledReportEmail({
        to: email,
        reportTitle: String(payload.reportTitle ?? "Report"),
        rowCount: Number(payload.rowCount ?? 0),
        reportPath: String(payload.href ?? "/hr/reports"),
        schedule: String(payload.schedule ?? "scheduled"),
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
