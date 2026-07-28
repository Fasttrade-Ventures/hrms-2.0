"use server";

import { revalidatePath } from "next/cache";

import {
  updateAuditRetentionSettings,
  updateSiemWebhookSettings,
} from "@/lib/audit/settings";

export type AuditSettingsActionState = {
  error?: string;
  success?: string;
};

export async function updateRetentionSettingsAction(
  _prev: AuditSettingsActionState,
  formData: FormData,
): Promise<AuditSettingsActionState> {
  try {
    await updateAuditRetentionSettings({
      retentionDays: Number(formData.get("retentionDays") ?? 2555),
      archiveEnabled: formData.get("archiveEnabled") === "true",
    });
    revalidatePath("/hr/audit/settings");
    return { success: "Retention settings saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save retention settings." };
  }
}

export async function updateSiemSettingsAction(
  _prev: AuditSettingsActionState,
  formData: FormData,
): Promise<AuditSettingsActionState> {
  try {
    await updateSiemWebhookSettings({
      url: String(formData.get("url") ?? ""),
      secret: String(formData.get("secret") ?? ""),
      eventsFilter: String(formData.get("eventsFilter") ?? ""),
      enabled: formData.get("enabled") === "true",
    });
    revalidatePath("/hr/audit/settings");
    return { success: "SIEM webhook settings saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save SIEM settings." };
  }
}
