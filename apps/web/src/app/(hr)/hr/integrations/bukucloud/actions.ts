"use server";

import { revalidatePath } from "next/cache";

import { requireBukucloudIntegrationAccess } from "@/lib/integrations/bukucloud/access";
import { testBukucloudConnection } from "@/lib/integrations/bukucloud/client";
import { getBukucloudConnectionConfig, upsertBukucloudConnection } from "@/lib/integrations/bukucloud/config";
import { syncPayrunToBukucloud } from "@/lib/integrations/bukucloud/sync";
import { requireRole } from "@/lib/auth/session";

export type BukucloudActionState = {
  error?: string;
  success?: string;
};

export async function saveBukucloudSettingsAction(
  _prev: BukucloudActionState,
  formData: FormData,
): Promise<BukucloudActionState> {
  try {
    await requireBukucloudIntegrationAccess();
    await upsertBukucloudConnection({
      baseUrl: String(formData.get("baseUrl") ?? ""),
      apiKey: String(formData.get("apiKey") ?? ""),
      signingKey: String(formData.get("signingKey") ?? ""),
      bankAccountCode: String(formData.get("bankAccountCode") ?? ""),
      tenantLabel: String(formData.get("tenantLabel") ?? ""),
      autoSyncOnLock: formData.get("autoSyncOnLock") === "true",
      enabled: formData.get("enabled") === "true",
    });
    revalidatePath("/hr/integrations/bukucloud");
    return { success: "BukuCloud settings saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save settings." };
  }
}

export async function testBukucloudConnectionAction(
  _prev: BukucloudActionState,
  formData: FormData,
): Promise<BukucloudActionState> {
  try {
    await requireBukucloudIntegrationAccess();
    const existing = await getBukucloudConnectionConfig();
    const apiKeyInput = String(formData.get("apiKey") ?? "");
    const signingKeyInput = String(formData.get("signingKey") ?? "");

    const config = {
      baseUrl: String(formData.get("baseUrl") ?? ""),
      apiKey: apiKeyInput && !apiKeyInput.includes("••••") ? apiKeyInput : (existing?.apiKey ?? ""),
      signingKey:
        signingKeyInput && signingKeyInput !== "••••••••" ? signingKeyInput : (existing?.signingKey ?? ""),
      bankAccountCode: String(formData.get("bankAccountCode") ?? existing?.bankAccountCode ?? ""),
      autoSyncOnLock: false,
      enabled: true,
    };

    if (!config.baseUrl || !config.apiKey) {
      return { error: "Base URL and API key are required to test the connection." };
    }

    await testBukucloudConnection(config);
    return { success: "Connection successful — tenant API key is valid." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Connection test failed." };
  }
}

export async function syncPayrunToBukucloudAction(
  _prev: BukucloudActionState,
  formData: FormData,
): Promise<BukucloudActionState> {
  try {
    await requireBukucloudIntegrationAccess();
    const session = await requireRole("hr_administrator");
    const payrunId = String(formData.get("payrunId") ?? "");
    const force = formData.get("force") === "true";

    if (!payrunId) return { error: "Payrun ID is required." };

    const result = await syncPayrunToBukucloud({
      payrunId,
      actorUserId: session.user.id,
      force,
    });

    revalidatePath(`/hr/payroll/${payrunId}`);
    return {
      success:
        result.status === "sent"
          ? `Synced to BukuCloud (journal #${result.externalJournalId ?? "—"}).`
          : "Sync completed.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "BukuCloud sync failed." };
  }
}
