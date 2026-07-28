import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

import { buildBankCsv, buildCimbFile, buildMaybankFile, mapBankRows } from "./bank";
import { resolveBranchEmployerCodes } from "./branch-codes";
import { storePayrollExport } from "./store";
import {
  buildEpfFile,
  buildHrdfFile,
  buildPcbFile,
  buildSocsoFile,
  mapStatutoryRows,
} from "./statutory";
import { loadPayrunBranchItems } from "./store";
import {
  validateEpfFileContent,
  validateSocsoFileContent,
  validateStatutoryExportRows,
} from "./validate";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

async function assertExportablePayrun(payrunId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_payruns")
    .select("status, period_year, period_month")
    .eq("id", payrunId)
    .eq("organization_id", getOrganizationId())
    .maybeSingle();

  if (!data) throw new Error("Payrun not found.");
  if (data.status !== "approved" && data.status !== "locked") {
    throw new Error("Exports are available after payrun approval.");
  }
  return data;
}

export async function generateBankExport(
  payrunId: string,
  branchId: string | null,
  format: "bank_csv" | "bank_maybank" | "bank_cimb",
  actorUserId: string,
) {
  await requireModule("payroll");
  await requireRole("hr_administrator");
  const payrun = await assertExportablePayrun(payrunId);
  const items = await loadPayrunBranchItems(payrunId, branchId);
  const periodLabel = `${payrun.period_year}-${String(payrun.period_month).padStart(2, "0")}`;
  const rows = mapBankRows(items, periodLabel);

  const content =
    format === "bank_maybank"
      ? buildMaybankFile(rows)
      : format === "bank_cimb"
        ? buildCimbFile(rows)
        : buildBankCsv(rows);

  return storePayrollExport({
    payrunId,
    branchId,
    exportType: format,
    fileName: `${format}-${periodLabel}-${branchId ?? "org"}.txt`,
    contentType: "text/plain",
    body: new TextEncoder().encode(content),
    generatedBy: actorUserId,
  });
}

export async function generateStatutoryExport(
  payrunId: string,
  branchId: string | null,
  type: "epf" | "socso" | "pcb" | "hrdf",
  actorUserId: string,
  options?: { employerEpfNumber?: string; employerSocsoCode?: string },
) {
  await requireModule("payroll");
  await requireRole("hr_administrator");
  const payrun = await assertExportablePayrun(payrunId);
  const items = await loadPayrunBranchItems(payrunId, branchId);
  const rows = mapStatutoryRows(items);
  const rowErrors = validateStatutoryExportRows(rows);
  if (rowErrors.length > 0) {
    throw new Error(rowErrors[0]);
  }

  const employerCodes = options?.employerEpfNumber
    ? {
        employerEpfNumber: options.employerEpfNumber,
        employerSocsoCode: options.employerSocsoCode ?? "",
      }
    : await resolveBranchEmployerCodes(branchId);

  const periodLabel = `${payrun.period_year}-${String(payrun.period_month).padStart(2, "0")}`;

  const content =
    type === "epf"
      ? buildEpfFile(rows, employerCodes.employerEpfNumber || "EMPLOYER")
      : type === "socso"
        ? buildSocsoFile(rows, employerCodes.employerSocsoCode || "PERKESO", periodLabel)
        : type === "pcb"
          ? buildPcbFile(rows, periodLabel)
          : buildHrdfFile(rows);

  if (type === "epf") {
    const errors = validateEpfFileContent(content, employerCodes.employerEpfNumber || "EMPLOYER");
    if (errors.length > 0) throw new Error(errors[0]);
  }
  if (type === "socso") {
    const errors = validateSocsoFileContent(content, employerCodes.employerSocsoCode || "PERKESO");
    if (errors.length > 0) throw new Error(errors[0]);
  }

  return storePayrollExport({
    payrunId,
    branchId,
    exportType: type,
    fileName: `${type}-${periodLabel}-${branchId ?? "org"}.txt`,
    contentType: "text/plain",
    body: new TextEncoder().encode(content),
    generatedBy: actorUserId,
  });
}
