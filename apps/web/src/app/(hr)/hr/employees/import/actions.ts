"use server";

import { revalidatePath } from "next/cache";

import { requireModule } from "@/lib/entitlements";
import { importEmployeesFromCsv, type EmployeeImportRowResult } from "@/lib/employees/import";
import { requireRole } from "@/lib/auth/session";

export type EmployeeImportActionState = {
  error?: string;
  success?: string;
  results?: EmployeeImportRowResult[];
};

export async function importEmployeesCsv(
  _prev: EmployeeImportActionState,
  formData: FormData,
): Promise<EmployeeImportActionState> {
  await requireModule("import");
  const session = await requireRole("hr_administrator");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file." };
  }

  const sendActivationEmail =
    formData.get("sendActivationEmail") === "on" || formData.get("sendActivationEmail") === "true";

  try {
    const csvText = await file.text();
    const { results, successCount, errorCount } = await importEmployeesFromCsv(
      csvText,
      session.user.id,
      { sendActivationEmail },
    );

    revalidatePath("/hr/employees");

    if (successCount === 0) {
      return {
        error: `No employees imported. ${errorCount} row(s) failed.`,
        results,
      };
    }

    return {
      success: `Imported ${successCount} employee(s)${errorCount ? `; ${errorCount} row(s) failed` : ""}.`,
      results,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed." };
  }
}
