"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { reconcilePayoutBatchFromUpload, updatePayoutItemStatus } from "@/lib/payouts/reconcile";

export type PayoutActionState = {
  error?: string;
  success?: string;
};

export async function reconcilePayoutUploadAction(
  _prev: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  try {
    await requireModule("payouts");
    const session = await requireRole("hr_administrator");
    const batchId = String(formData.get("batchId") ?? "");
    const payrunId = String(formData.get("payrunId") ?? "");
    const content = String(formData.get("content") ?? "").trim();

    if (!batchId || !content) return { error: "Batch and response content are required." };

    const result = await reconcilePayoutBatchFromUpload({
      batchId,
      content,
      uploadedBy: session.user.id,
    });

    revalidatePath(`/hr/payroll/${payrunId}`);
    return {
      success: `Reconciled ${result.updated} of ${result.matched} parsed rows.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to reconcile payout batch." };
  }
}

export async function updatePayoutItemStatusAction(
  _prev: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  try {
    await requireModule("payouts");
    await requireRole("hr_administrator");
    const itemId = String(formData.get("itemId") ?? "");
    const payrunId = String(formData.get("payrunId") ?? "");
    const status = String(formData.get("status") ?? "") as "pending" | "submitted" | "paid" | "failed";

    if (!itemId) return { error: "Item ID is required." };
    if (!["pending", "submitted", "paid", "failed"].includes(status)) {
      return { error: "Invalid status." };
    }

    await updatePayoutItemStatus(itemId, status);
    revalidatePath(`/hr/payroll/${payrunId}`);
    return { success: "Payout item updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update payout item." };
  }
}
