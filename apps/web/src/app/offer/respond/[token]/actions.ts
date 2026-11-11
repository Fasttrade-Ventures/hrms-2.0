"use server";

import { candidateAcceptOffer, candidateRejectOffer } from "@/lib/recruitment/offer-candidate";

export type OfferRespondState =
  | { status: "idle" }
  | { status: "accepted"; agreementEmailed: boolean }
  | { status: "declined" }
  | { status: "error"; error: string };

/** Public (token) action. Never returns internal links or warnings to the candidate. */
export async function respondToOfferAction(
  _prev: OfferRespondState,
  formData: FormData,
): Promise<OfferRespondState> {
  const token = String(formData.get("token") ?? "");
  const decision = String(formData.get("decision") ?? "");
  try {
    if (decision === "accept") {
      const result = await candidateAcceptOffer(token);
      return { status: "accepted", agreementEmailed: result.emailSent };
    }
    if (decision === "reject") {
      await candidateRejectOffer(token);
      return { status: "declined" };
    }
    return { status: "error", error: "Choose accept or decline." };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
}
