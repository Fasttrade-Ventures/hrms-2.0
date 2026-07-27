"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole, requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { lockPayrun } from "@/lib/hr/payroll";
import {
  deleteRecurringAllowance,
  setYtdOpeningBalance,
  upsertEmployeeCompensation,
  upsertEmployeeTaxProfile,
  upsertRecurringAllowance,
  type EmployeeCompensation,
} from "@/lib/payroll/compensation";
import { generateDraftPayrun } from "@/lib/payroll/generate";
import { approvePayrun, deletePayrun, submitPayrunForReview } from "@/lib/payroll/workflow";
import { createPayrunSchema, createPayGroupSchema } from "@hrms/validation";

export type HrActionState = {
  error?: string;
  success?: string;
  downloadHref?: string;
  downloadFileName?: string;
};

function exportReadyState(result: {
  downloadPath: string;
  fileName: string;
}): HrActionState {
  return {
    success: "Export file is ready.",
    downloadHref: result.downloadPath,
    downloadFileName: result.fileName,
  };
}

async function guardPayroll() {
  requireModule("payroll");
  return requireRoleOrPermission(["hr_administrator"], ["payroll_processor"]);
}

async function guardPayrollApprover() {
  requireModule("payroll");
  return requireRoleOrPermission(["hr_administrator", "director"], ["payroll_approver"]);
}

function revalidateEmployee(employeeId: string) {
  revalidatePath(`/hr/employees/${employeeId}`);
}

export async function createPayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const scope = String(formData.get("scope") ?? "org_wide");
  const payGroupIdRaw = String(formData.get("payGroupId") ?? "");

  const parsed = createPayrunSchema.safeParse({
    scope,
    payGroupId: payGroupIdRaw || undefined,
    payrunType: String(formData.get("payrunType") ?? "regular"),
    periodYear: Number(formData.get("periodYear")),
    periodMonth: Number(formData.get("periodMonth")),
    periodWeek: String(formData.get("periodWeek") ?? "").trim()
      ? Number(formData.get("periodWeek"))
      : undefined,
    earningPeriodStart: String(formData.get("earningPeriodStart") ?? ""),
    earningPeriodEnd: String(formData.get("earningPeriodEnd") ?? ""),
    payDate: String(formData.get("payDate") ?? ""),
  });

  if (!parsed.success) {
    return { error: "Please complete all required payrun fields." };
  }

  let payrunId: string;
  try {
    await guardPayroll();
    payrunId = await generateDraftPayrun(parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create payrun." };
  }

  revalidatePath("/hr/payroll");
  redirect(`/hr/payroll/${payrunId}`);
}

export async function updateEmployeeCompensationAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return { error: "Missing employee." };

  const socsoOverride = String(formData.get("socsoCategoryOverride") ?? "");
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "");
  const dailyRateRaw = String(formData.get("dailyRate") ?? "");

  try {
    await guardPayroll();
    await upsertEmployeeCompensation(employeeId, {
      payBasis: String(formData.get("payBasis") ?? "monthly") as EmployeeCompensation["payBasis"],
      basicSalary: Number(formData.get("basicSalary") ?? 0),
      hourlyRate: hourlyRateRaw ? Number(hourlyRateRaw) : null,
      dailyRate: dailyRateRaw ? Number(dailyRateRaw) : null,
      voluntaryEpfExtraRate: Number(formData.get("voluntaryEpfExtraRate") ?? 0),
      socsoCategoryOverride:
        socsoOverride === "cat1" || socsoOverride === "cat2" ? socsoOverride : null,
      epfEmployeeRate: Number(formData.get("epfEmployeeRate") ?? 11),
      epfEmployerRate: Number(formData.get("epfEmployerRate") ?? 13),
      eisEligible: formData.get("eisEligible") === "on",
    });
    revalidateEmployee(employeeId);
    return { success: "Compensation saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save compensation." };
  }
}

export async function upsertRecurringAllowanceAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const componentId = String(formData.get("componentId") ?? "");
  if (!employeeId || !componentId) return { error: "Allowance type is required." };

  try {
    await guardPayroll();
    await upsertRecurringAllowance(employeeId, {
      componentId,
      amount: Number(formData.get("amount") ?? 0),
      effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
      effectiveTo: String(formData.get("effectiveTo") ?? "") || null,
    });
    revalidateEmployee(employeeId);
    return { success: "Allowance added." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add allowance." };
  }
}

export async function deleteRecurringAllowanceAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const allowanceId = String(formData.get("allowanceId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!allowanceId) return { error: "Missing allowance." };

  try {
    await guardPayroll();
    await deleteRecurringAllowance(allowanceId);
    if (employeeId) revalidateEmployee(employeeId);
    return { success: "Allowance removed." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to remove allowance." };
  }
}

export async function updateEmployeeTaxProfileAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return { error: "Missing employee." };

  const spouseWorkingRaw = String(formData.get("spouseWorking") ?? "");
  const saveYtd = formData.get("saveYtd") === "1";

  try {
    await guardPayroll();

    if (saveYtd) {
      const year = new Date().getFullYear();
      await setYtdOpeningBalance(employeeId, year, {
        gross: Number(formData.get("ytdGross") ?? 0),
        epf: Number(formData.get("ytdEpf") ?? 0),
        pcb: Number(formData.get("ytdPcb") ?? 0),
      });
      revalidateEmployee(employeeId);
      return { success: "TP3 opening balances saved." };
    }

    await upsertEmployeeTaxProfile(employeeId, {
      maritalStatus: String(formData.get("maritalStatus") ?? "") || null,
      spouseWorking:
        spouseWorkingRaw === "yes" ? true : spouseWorkingRaw === "no" ? false : null,
      zakatAnnual: Number(formData.get("zakatAnnual") ?? 0),
      zakatMonthly: Number(formData.get("zakatMonthly") ?? 0),
      otherReliefs: Number(formData.get("otherReliefs") ?? 0),
    });
    revalidateEmployee(employeeId);
    return { success: "TP1 profile saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save tax profile." };
  }
}

export async function submitPayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  if (!payrunId) return { error: "Missing payrun." };

  try {
    const session = await guardPayroll();
    await submitPayrunForReview(payrunId, session.user.id);
    revalidatePath(`/hr/payroll/${payrunId}`);
    return { success: "Payrun submitted for review." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to submit payrun." };
  }
}

export async function approvePayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  if (!payrunId) return { error: "Missing payrun." };

  try {
    const session = await guardPayrollApprover();
    await approvePayrun(payrunId, session.user.id);
    revalidatePath(`/hr/payroll/${payrunId}`);
    return { success: "Payrun approved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to approve payrun." };
  }
}

export async function lockPayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  if (!payrunId) return { error: "Missing payrun." };

  try {
    const session = await guardPayrollApprover();
    await lockPayrun(payrunId, session.user.id);
    revalidatePath("/hr/payroll");
    revalidatePath(`/hr/payroll/${payrunId}`);
    return { success: "Payrun locked." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to lock payrun." };
  }
}

export async function deletePayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  if (!payrunId) return { error: "Missing payrun." };

  try {
    const session = await guardPayroll();
    await deletePayrun(payrunId, session.user.id);
    revalidatePath("/hr/payroll");
    redirect("/hr/payroll");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete payrun." };
  }
}

export async function editPayrunLineAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunItemId = String(formData.get("payrunItemId") ?? "");
  const payrunId = String(formData.get("payrunId") ?? "");
  const componentCode = String(formData.get("componentCode") ?? "");
  const amount = Number(formData.get("amount"));

  if (!payrunItemId || !componentCode) return { error: "Missing line details." };

  try {
    await guardPayroll();
    const { editPayrunLine } = await import("@/lib/payroll/edit");
    await editPayrunLine(payrunItemId, componentCode, amount);
    revalidatePath("/hr/payroll");
    if (payrunId) revalidatePath(`/hr/payroll/${payrunId}`);
    return { success: "Pay line updated and statutory amounts recalculated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update pay line." };
  }
}

export async function exportBankAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  const branchId = String(formData.get("branchId") ?? "") || null;
  const format = String(formData.get("format") ?? "bank_csv") as "bank_csv" | "bank_maybank" | "bank_cimb";

  try {
    const session = await guardPayroll();
    const { generateBankExport } = await import("@/lib/payroll/exports");
    const result = await generateBankExport(payrunId, branchId, format, session.user.id);
    revalidatePath(`/hr/payroll/${payrunId}`);
    return exportReadyState(result);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate bank export." };
  }
}

export async function exportStatutoryAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  const branchId = String(formData.get("branchId") ?? "") || null;
  const statutoryType = String(formData.get("statutoryType") ?? "epf") as "epf" | "socso" | "pcb" | "hrdf";

  try {
    const session = await guardPayroll();
    const { generateStatutoryExport } = await import("@/lib/payroll/exports");
    const result = await generateStatutoryExport(payrunId, branchId, statutoryType, session.user.id);
    revalidatePath(`/hr/payroll/${payrunId}`);
    return exportReadyState(result);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate statutory export." };
  }
}

export async function generateCp8dAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const calendarYear = Number(formData.get("calendarYear"));
  const branchId = String(formData.get("branchId") ?? "") || null;

  try {
    const session = await guardPayroll();
    const { generateCp8dExport } = await import("@/lib/payroll/exports/year-end");
    const result = await generateCp8dExport(calendarYear, session.user.id, branchId);
    return exportReadyState(result);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate CP8D export." };
  }
}

export async function generateEaPdfAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const calendarYear = Number(formData.get("calendarYear"));

  if (!employeeId) return { error: "Missing employee." };

  try {
    const session = await guardPayroll();
    const { generateEaPdfForEmployee } = await import("@/lib/payroll/exports/year-end");
    const result = await generateEaPdfForEmployee(employeeId, calendarYear, session.user.id);
    return exportReadyState(result);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate EA PDF." };
  }
}

export async function generateEaPdfBulkAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const calendarYear = Number(formData.get("calendarYear"));
  const branchId = String(formData.get("branchId") ?? "") || null;

  try {
    const session = await guardPayroll();
    const { generateEaPdfBulk } = await import("@/lib/payroll/exports/year-end");
    const result = await generateEaPdfBulk(calendarYear, session.user.id, branchId);
    return exportReadyState(result);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate EA PDFs." };
  }
}

export async function createPayGroupAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const parsed = createPayGroupSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    cycle: String(formData.get("cycle") ?? "monthly"),
    cutoffDay: String(formData.get("cutoffDay") ?? "6").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid pay group details." };
  }

  try {
    await guardPayroll();
    const { createPayGroup } = await import("@/lib/payroll/settings");
    await createPayGroup(parsed.data);
    revalidatePath("/hr/organization/pay-groups");
    return { success: "Pay group created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create pay group." };
  }
}

export async function deletePayGroupAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payGroupId = String(formData.get("payGroupId") ?? "");
  if (!payGroupId) return { error: "Missing pay group." };

  try {
    await guardPayroll();
    const { deletePayGroup } = await import("@/lib/payroll/settings");
    await deletePayGroup(payGroupId);
    revalidatePath("/hr/organization/pay-groups");
    return { success: "Pay group deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete pay group." };
  }
}

export async function setPayrollComponentActiveAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const componentId = String(formData.get("componentId") ?? "");
  const isActive = formData.get("isActive") === "true";

  if (!componentId) return { error: "Missing component." };

  try {
    await guardPayroll();
    const { setPayrollComponentActive } = await import("@/lib/payroll/settings");
    await setPayrollComponentActive(componentId, isActive);
    revalidatePath("/hr/organization/payroll-components");
    return { success: isActive ? "Component activated." : "Component deactivated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update component." };
  }
}
