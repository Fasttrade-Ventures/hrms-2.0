"use server";

import { revalidatePath } from "next/cache";

import { requireModule } from "@/lib/entitlements";
import { submitStaffPulseSurvey } from "@/lib/hr/pulse-survey-runs";

export async function submitEmployeePulseAction(input: {
  runId: string;
  answers: Array<{
    questionId: string;
    score?: number | null;
    textValue?: string | null;
    booleanValue?: boolean | null;
    choiceIds: string[];
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireModule("performance");
    await submitStaffPulseSurvey(input);
    revalidatePath("/employee/pulse");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not submit." };
  }
}
