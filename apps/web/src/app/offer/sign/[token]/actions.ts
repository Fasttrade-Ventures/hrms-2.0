"use server";

import { submitSignedAgreement } from "@/lib/recruitment/offer-candidate";

export type OfferSignState = { status: "idle" } | { status: "uploaded" } | { status: "error"; error: string };

/** Public (token) action: upload the signed agreement. */
export async function uploadSignedAgreementAction(
  _prev: OfferSignState,
  formData: FormData,
): Promise<OfferSignState> {
  const token = String(formData.get("token") ?? "");
  const file = formData.get("file");
  try {
    if (!(file instanceof File)) return { status: "error", error: "Choose a signed file to upload." };
    await submitSignedAgreement(token, file);
    return { status: "uploaded" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Upload failed. Please try again.",
    };
  }
}
