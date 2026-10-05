import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { assertPulseScore, averageScore } from "@/lib/hr/pulse";
import { createClient } from "@/lib/supabase/server";

export async function createPulseSurvey(question: string, opensOn: string, closesOn: string): Promise<void> {
  const session = await requireRole("hr_administrator");
  const supabase = await createClient();
  const { error } = await supabase.from("pulse_surveys").insert({
    organization_id: await requireOrganizationId(),
    question: question.trim(),
    opens_on: opensOn,
    closes_on: closesOn,
    created_by: session.user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/hr/pulse");
}

export async function listPulseSurveys() {
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();
  const { data, error } = await supabase
    .from("pulse_surveys")
    .select("id, question, opens_on, closes_on")
    .eq("organization_id", organizationId)
    .order("opens_on", { ascending: false });
  if (error) throw new Error(error.message);

  const surveys = [];
  for (const survey of data ?? []) {
    const { data: responses } = await supabase
      .from("pulse_responses")
      .select("score")
      .eq("survey_id", survey.id)
      .eq("organization_id", organizationId);
    const scores = (responses ?? []).map((row) => Number(row.score));
    surveys.push({
      id: survey.id as string,
      question: survey.question as string,
      opensOn: survey.opens_on as string,
      closesOn: survey.closes_on as string,
      count: scores.length,
      average: averageScore(scores),
    });
  }
  return surveys;
}

export async function submitPulseScore(surveyId: string, score: number): Promise<void> {
  assertPulseScore(score);
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: survey } = await supabase
    .from("pulse_surveys")
    .select("id, opens_on, closes_on")
    .eq("id", surveyId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!survey || survey.opens_on > today || survey.closes_on < today) {
    throw new Error("This survey is not open.");
  }
  const { error } = await supabase.from("pulse_responses").insert({
    organization_id: organizationId,
    survey_id: surveyId,
    employee_id: employeeId,
    score,
  });
  if (error) {
    if (error.code === "23505") throw new Error("You already answered this survey.");
    throw new Error(error.message);
  }
  revalidatePath("/employee/pulse");
}

export async function listOpenPulseSurveys() {
  const { organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("pulse_surveys")
    .select("id, question, opens_on, closes_on")
    .eq("organization_id", organizationId)
    .lte("opens_on", today)
    .gte("closes_on", today);
  if (error) throw new Error(error.message);
  return data ?? [];
}
