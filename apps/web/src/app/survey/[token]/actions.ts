"use server";

import { submitPublicPulseSurvey } from "@/lib/hr/pulse-survey-runs";

export async function submitPublicPulseAction(
  token: string,
  answers: Array<{
    questionId: string;
    score?: number | null;
    textValue?: string | null;
    booleanValue?: boolean | null;
    choiceIds: string[];
  }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await submitPublicPulseSurvey(token, { answers });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not submit." };
  }
}
