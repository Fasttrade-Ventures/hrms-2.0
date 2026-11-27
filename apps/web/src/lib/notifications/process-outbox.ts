import {
  S3R2StorageAdapter,
  StubR2StorageAdapter,
  type R2StorageAdapter,
  sendAnnouncementEmail,
  sendApprovalConfirmationEmail,
  sendApprovalDecisionEmail,
  sendApprovalPendingEmail,
  sendDocumentComplianceEmail,
  sendNoticeEmail,
  sendPayslipAvailableEmail,
  sendPulseSurveyOpenedEmail,
  sendScheduledReportEmail,
  type ApprovalDetailItem,
} from "@hrms/platform";

import { generatePayslipPdf } from "@/lib/payroll/pdf";
import { createAdminClient } from "@/lib/supabase/admin";

function allowR2Stub(): boolean {
  if (process.env.ALLOW_R2_STUB === "1") return true;
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_R2_STUB !== "0";
}

function getStorageAdapter(): R2StorageAdapter {
  try {
    return new S3R2StorageAdapter();
  } catch (err) {
    if (allowR2Stub()) {
      console.warn("R2 storage not configured; ALLOW_R2_STUB/local fallback active:", err);
      return new StubR2StorageAdapter();
    }
    throw err instanceof Error
      ? err
      : new Error("R2 storage is not configured. Set R2_* env vars or ALLOW_R2_STUB=1 for local only.");
  }
}

export async function processNotificationOutbox(
  limit = 25,
  template?: string,
): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const admin = createAdminClient();
  let query = admin
    .from("notification_outbox")
    .select("id, recipient_user_id, template, payload, status")
    .eq("channel", "email")
    .eq("status", "pending");

  if (template) query = query.eq("template", template);

  const { data: rows, error } = await query.order("created_at").limit(limit);

  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    if (!row.recipient_user_id) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    const { data: userData } = await admin.auth.admin.getUserById(row.recipient_user_id);
    let email = userData.user?.email;
    const payload = (row.payload ?? {}) as Record<string, unknown>;

    if (!email && typeof payload.recipientEmail === "string") {
      email = payload.recipientEmail;
    }

    if (!email) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }
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
        remainingDays: typeof payload.remainingDays === "number" ? payload.remainingDays : null,
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
            organization_id,
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

          const itemOrganizationId = String(
            (item as { organization_id?: string }).organization_id ?? payload.organizationId ?? "",
          );
          const { data: itemOrganization } = itemOrganizationId
            ? await admin
                .from("organizations")
                .select("country")
                .eq("id", itemOrganizationId)
                .maybeSingle()
            : { data: null };

          const pdfBuffer = generatePayslipPdf({
            country: itemOrganization?.country === "AU" ? "AU" : "MY",
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
          const fallbackOrgId =
            (process.env.DEPLOYMENT_MODE ?? "standalone") === "standalone"
              ? process.env.DEFAULT_ORGANIZATION_ID
              : undefined;
          const organizationId = String(payload.organizationId ?? fallbackOrgId ?? "");
          if (!organizationId) {
            throw new Error("Payslip email missing organizationId");
          }
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
    } else if (row.template === "announcement.published") {
      const href = String(payload.href ?? "/employee/announcements");
      result = await sendAnnouncementEmail({
        to: email,
        title: String(payload.title ?? "New announcement"),
        message: String(payload.message ?? ""),
        announcementPath: href.startsWith("/") ? href : `/${href}`,
      });
    } else if (row.template === "pulse.survey_opened") {
      const href = String(payload.href ?? "/employee/pulse");
      result = await sendPulseSurveyOpenedEmail({
        to: email,
        title: String(payload.title ?? "Pulse survey"),
        message: String(payload.message ?? ""),
        surveyPath: href.startsWith("/") ? href : `/${href}`,
      });
    } else if (row.template === "celebration.notice") {
      result = await sendNoticeEmail({
        to: email,
        subject: String(payload.subject ?? "Hirix HR"),
        message: String(payload.message ?? ""),
      });
    } else if (row.template === "reports.scheduled") {
      result = await sendScheduledReportEmail({
        to: email,
        reportTitle: String(payload.reportTitle ?? "Report"),
        rowCount: Number(payload.rowCount ?? 0),
        reportPath: String(payload.href ?? "/hr/reports"),
        schedule: String(payload.schedule ?? "scheduled"),
      });
    } else if (row.template === "approval.pending") {
      const details = Array.isArray(payload.details)
        ? (payload.details as ApprovalDetailItem[])
        : undefined;

      result = await sendApprovalPendingEmail({
        to: email,
        recipientName: String(payload.recipientName ?? "Approver"),
        requesterName: String(payload.requesterName ?? "Employee"),
        requesterEmployeeNumber: payload.requesterEmployeeNumber ? String(payload.requesterEmployeeNumber) : null,
        requestTypeLabel: String(payload.requestTypeLabel ?? "Request"),
        requestSummary: String(payload.requestSummary ?? "Pending request"),
        details,
        actionPath: String(payload.href ?? `/manager/approvals/${payload.stepId ?? ""}`),
        dueDate: payload.dueDate ? String(payload.dueDate) : null,
        isEscalated: Boolean(payload.isEscalated),
      });
    } else if (row.template === "approval.submitted") {
      const details = Array.isArray(payload.details)
        ? (payload.details as ApprovalDetailItem[])
        : undefined;

      const defaultViewPath =
        payload.requestType === "leave"
          ? "/employee/leave"
          : payload.requestType === "overtime"
            ? "/employee/overtime"
            : "/employee/claims";

      result = await sendApprovalConfirmationEmail({
        to: email,
        employeeName: String(payload.employeeName ?? "Employee"),
        requestTypeLabel: String(payload.requestTypeLabel ?? "Request"),
        requestSummary: String(payload.requestSummary ?? "Submitted request"),
        details,
        viewPath: String(payload.href ?? defaultViewPath),
      });
    } else if (row.template === "approval.approve" || row.template === "approval.reject") {
      const defaultViewPath =
        payload.requestType === "leave"
          ? "/employee/leave"
          : payload.requestType === "overtime"
            ? "/employee/overtime"
            : "/employee/claims";

      result = await sendApprovalDecisionEmail({
        to: email,
        employeeName: String(payload.employeeName ?? "Employee"),
        requestTypeLabel: String(payload.requestTypeLabel ?? "Request"),
        requestSummary: String(payload.requestSummary ?? "Request update"),
        status: row.template === "approval.approve" ? "approved" : "rejected",
        approverComment: payload.comment ? String(payload.comment) : null,
        viewPath: String(payload.href ?? defaultViewPath),
      });
    }

    if (!result) {
      await admin.from("notification_outbox").update({ status: "failed" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    if (!result.sent) {
      if (
        result.reason === "not_configured" &&
        (row.template === "announcement.published" ||
          row.template === "pulse.survey_opened" ||
          row.template.startsWith("approval."))
      ) {
        continue;
      }
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
