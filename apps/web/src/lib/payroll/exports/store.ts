import { S3R2StorageAdapter } from "@hrms/platform";

import { logAuditEvent } from "@/lib/audit/log-event";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type ExportResult = {
  exportId: string;
  downloadPath: string;
  fileName: string;
};

export async function storePayrollExport(input: {
  payrunId: string | null;
  branchId: string | null;
  exportType: string;
  fileName: string;
  contentType: string;
  body: Uint8Array;
  generatedBy: string;
}): Promise<ExportResult> {
  const organizationId = getOrganizationId();
  const adapter = new S3R2StorageAdapter();
  const ref = await adapter.putObject({
    organizationId,
    category: "payroll-exports",
    fileName: input.fileName,
    contentType: input.contentType,
    body: input.body,
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payroll_exports")
    .insert({
      organization_id: organizationId,
      payrun_id: input.payrunId,
      branch_id: input.branchId,
      export_type: input.exportType,
      file_key: ref.key,
      generated_by: input.generatedBy,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to record export.");

  await logAuditEvent({
    organizationId,
    actorUserId: input.generatedBy,
    action: "payroll.exported",
    resourceType: "payroll_export",
    resourceId: data.id,
    metadata: { payrunId: input.payrunId, branchId: input.branchId, exportType: input.exportType },
  });

  return {
    exportId: data.id,
    downloadPath: `/api/hr/payroll/exports/${data.id}/download`,
    fileName: input.fileName,
  };
}

export async function getPayrollExportDownloadUrl(exportId: string): Promise<string | null> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_exports")
    .select("file_key")
    .eq("id", exportId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) return null;
  const adapter = new S3R2StorageAdapter();
  const bucket = process.env.R2_BUCKET ?? "hrms-private";
  return adapter.getSignedDownloadUrl({ bucket, key: data.file_key });
}

export type BankExportRow = {
  employeeName: string;
  icNumber: string;
  bankName: string;
  bankAccountNumber: string;
  netPay: number;
  employeeNumber: string;
  periodLabel: string;
};

export type StatutoryExportRow = {
  employeeName: string;
  icNumber: string;
  employeeNumber: string;
  epfNumber: string;
  socsoNumber: string;
  taxNumber: string;
  grossPay: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
  hrdfEmployer: number;
  epfWageBase: number;
  socsoWageBase: number;
  pcbWageBase: number;
};

export async function loadPayrunBranchItems(payrunId: string, branchId: string | null) {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  let query = supabase
    .from("payroll_payrun_items")
    .select(
      `gross_pay, net_pay, epf_employee, epf_employer, socso_employee, socso_employer, eis_employee, eis_employer, pcb, hrdf_employer, epf_wage_base, socso_wage_base, pcb_wage_base,
       employees(employee_number, full_name, employee_profiles(ic_number, bank_name, bank_account_number, epf_number, socso_number, tax_number))`,
    )
    .eq("payrun_id", payrunId)
    .eq("organization_id", organizationId);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
