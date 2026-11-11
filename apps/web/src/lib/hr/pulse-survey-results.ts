import type { PulseQuestionType } from "@hrms/validation";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import {
  averageScore,
  canShowGroupSplit,
  computeEnps,
  hideAverageUntilThreshold,
  PULSE_MIN_ANSWERS_FOR_RESULTS,
} from "@/lib/hr/pulse";
import { getPulseSurveyRunDetail } from "@/lib/hr/pulse-survey-runs";
import { createClient } from "@/lib/supabase/server";

export type PulseQuestionSummary = {
  questionId: string;
  title: string;
  questionType: PulseQuestionType;
  staffAnswerCount: number;
  linkAnswerCount: number;
  average: number | null;
  enps: ReturnType<typeof computeEnps> | null;
  yesCount: number | null;
  noCount: number | null;
  choiceCounts: Array<{ choiceId: string; label: string; count: number }> | null;
  textAnswers: string[];
  departmentSplits: Array<{ departmentId: string; departmentName: string; count: number; average: number | null }>;
  branchSplits: Array<{ branchId: string; branchName: string; count: number; average: number | null }>;
};

export type PulseRunResults = {
  runId: string;
  name: string;
  invitedCount: number;
  staffAnsweredCount: number;
  linkAnsweredCount: number;
  responseRate: number | null;
  previousAverage: number | null;
  questions: PulseQuestionSummary[];
  minAnswers: number;
};

export async function getPulseSurveyRunResults(runId: string): Promise<PulseRunResults | null> {
  await requireRole("hr_administrator");
  const detail = await getPulseSurveyRunDetail(runId);
  if (!detail) return null;

  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: responses, error } = await supabase
    .from("pulse_survey_responses")
    .select("id, channel, employee_id, invitation_id")
    .eq("run_id", runId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const responseIds = (responses ?? []).map((row) => row.id);
  const staffResponses = (responses ?? []).filter((row) => row.channel === "staff");
  const linkResponses = (responses ?? []).filter((row) => row.channel === "link");

  const { data: invitations } = await supabase
    .from("pulse_survey_invitations")
    .select("id, employee_id, branch_id, department_id")
    .eq("run_id", runId);

  const invitationById = new Map((invitations ?? []).map((row) => [row.id, row]));

  const departmentIds = [
    ...new Set((invitations ?? []).map((row) => row.department_id).filter(Boolean)),
  ] as string[];
  const branchIds = [
    ...new Set((invitations ?? []).map((row) => row.branch_id).filter(Boolean)),
  ] as string[];

  const departmentNames = new Map<string, string>();
  const branchNames = new Map<string, string>();
  if (departmentIds.length > 0) {
    const { data } = await supabase.from("departments").select("id, name").in("id", departmentIds);
    for (const row of data ?? []) departmentNames.set(row.id, row.name);
  }
  if (branchIds.length > 0) {
    const { data } = await supabase.from("branches").select("id, name").in("id", branchIds);
    for (const row of data ?? []) branchNames.set(row.id, row.name);
  }

  const { data: answers } =
    responseIds.length > 0
      ? await supabase
          .from("pulse_survey_answers")
          .select("response_id, question_id, score, text_value, boolean_value, choice_ids")
          .in("response_id", responseIds)
      : { data: [] };

  const responseChannel = new Map((responses ?? []).map((row) => [row.id, row.channel as string]));
  const responseInvitation = new Map(
    (responses ?? []).map((row) => [row.id, row.invitation_id as string | null]),
  );

  const questions: PulseQuestionSummary[] = [];

  for (const section of detail.sections) {
    for (const question of section.questions) {
      const questionAnswers = (answers ?? []).filter((row) => row.question_id === question.id);
      const staffAnswers = questionAnswers.filter(
        (row) => responseChannel.get(row.response_id) === "staff",
      );
      const linkAnswers = questionAnswers.filter(
        (row) => responseChannel.get(row.response_id) === "link",
      );

      const staffScores = staffAnswers
        .map((row) => row.score)
        .filter((score): score is number => typeof score === "number");

      const average = hideAverageUntilThreshold(staffScores.length, averageScore(staffScores));

      let enps: ReturnType<typeof computeEnps> | null = null;
      if (question.questionType === "enps") {
        enps =
          staffScores.length >= PULSE_MIN_ANSWERS_FOR_RESULTS
            ? computeEnps(staffScores)
            : { promoters: 0, passive: 0, detractors: 0, score: null };
      }

      let yesCount: number | null = null;
      let noCount: number | null = null;
      if (question.questionType === "yes_no") {
        yesCount = staffAnswers.filter((row) => row.boolean_value === true).length;
        noCount = staffAnswers.filter((row) => row.boolean_value === false).length;
      }

      let choiceCounts: Array<{ choiceId: string; label: string; count: number }> | null = null;
      if (question.questionType === "single_choice" || question.questionType === "multi_choice") {
        choiceCounts = question.choices.map((choice) => ({
          choiceId: choice.id,
          label: choice.label,
          count: staffAnswers.filter((row) => (row.choice_ids ?? []).includes(choice.id)).length,
        }));
      }

      const textAnswers =
        question.questionType === "short_text" || question.questionType === "long_text"
          ? staffAnswers
              .map((row) => (row.text_value ?? "").trim())
              .filter(Boolean)
          : [];

      const departmentBuckets = new Map<string, number[]>();
      const branchBuckets = new Map<string, number[]>();
      for (const answer of staffAnswers) {
        if (typeof answer.score !== "number") continue;
        const invitationId = responseInvitation.get(answer.response_id);
        const invitation = invitationId ? invitationById.get(invitationId) : null;
        if (invitation?.department_id) {
          const list = departmentBuckets.get(invitation.department_id) ?? [];
          list.push(answer.score);
          departmentBuckets.set(invitation.department_id, list);
        }
        if (invitation?.branch_id) {
          const list = branchBuckets.get(invitation.branch_id) ?? [];
          list.push(answer.score);
          branchBuckets.set(invitation.branch_id, list);
        }
      }

      const departmentSplits = [...departmentBuckets.entries()]
        .filter(([, scores]) => canShowGroupSplit(scores.length))
        .map(([departmentId, scores]) => ({
          departmentId,
          departmentName: departmentNames.get(departmentId) ?? "Department",
          count: scores.length,
          average: averageScore(scores),
        }));

      const branchSplits = [...branchBuckets.entries()]
        .filter(([, scores]) => canShowGroupSplit(scores.length))
        .map(([branchId, scores]) => ({
          branchId,
          branchName: branchNames.get(branchId) ?? "Branch",
          count: scores.length,
          average: averageScore(scores),
        }));

      questions.push({
        questionId: question.id,
        title: question.title,
        questionType: question.questionType,
        staffAnswerCount: staffAnswers.length,
        linkAnswerCount: linkAnswers.length,
        average,
        enps,
        yesCount,
        noCount,
        choiceCounts,
        textAnswers,
        departmentSplits,
        branchSplits,
      });
    }
  }

  let previousAverage: number | null = null;
  if (detail.templateId) {
    const { data: priorRuns } = await supabase
      .from("pulse_survey_runs")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_id", detail.templateId)
      .neq("id", runId)
      .order("opens_on", { ascending: false })
      .limit(1);

    const priorId = priorRuns?.[0]?.id;
    if (priorId) {
      const { data: priorResponses } = await supabase
        .from("pulse_survey_responses")
        .select("id")
        .eq("run_id", priorId)
        .eq("channel", "staff");
      const priorResponseIds = (priorResponses ?? []).map((row) => row.id);
      if (priorResponseIds.length >= PULSE_MIN_ANSWERS_FOR_RESULTS) {
        const { data: priorAnswers } = await supabase
          .from("pulse_survey_answers")
          .select("score")
          .in("response_id", priorResponseIds)
          .not("score", "is", null);
        const scores = (priorAnswers ?? [])
          .map((row) => row.score)
          .filter((score): score is number => typeof score === "number");
        previousAverage = averageScore(scores);
      }
    }
  }

  const invitedCount = detail.invitedCount;
  const staffAnsweredCount = staffResponses.length;
  const linkAnsweredCount = linkResponses.length;

  return {
    runId: detail.id,
    name: detail.name,
    invitedCount,
    staffAnsweredCount,
    linkAnsweredCount,
    responseRate: invitedCount > 0 ? staffAnsweredCount / invitedCount : null,
    previousAverage,
    questions,
    minAnswers: PULSE_MIN_ANSWERS_FOR_RESULTS,
  };
}
