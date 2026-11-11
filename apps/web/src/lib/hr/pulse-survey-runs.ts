import { randomBytes } from "crypto";

import {
  openPulseSurveyRunSchema,
  submitPulseSurveySchema,
  type OpenPulseSurveyRunInput,
  type PulseQuestionType,
  type PulseRatingScale,
  type SubmitPulseSurveyInput,
} from "@hrms/validation";

import { announcementMatchesAudience } from "@/lib/announcements/audience";
import { logAuditEvent } from "@/lib/audit/log-event";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { pulseRunStatus } from "@/lib/hr/pulse";
import { getPulseSurveyTemplateDetail } from "@/lib/hr/pulse-survey-templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PulseRunListItem = {
  id: string;
  name: string;
  templateId: string | null;
  status: "draft" | "scheduled" | "open" | "closed";
  opensOn: string;
  closesOn: string;
  invitedCount: number;
  staffAnsweredCount: number;
  linkAnsweredCount: number;
  publicLinkEnabled: boolean;
  publicToken: string | null;
};

export type PulseRunQuestion = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  questionType: PulseQuestionType;
  required: boolean;
  sortOrder: number;
  ratingScale: PulseRatingScale | null;
  choices: Array<{ id: string; label: string; sortOrder: number }>;
};

export type PulseRunSection = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: PulseRunQuestion[];
};

export type PulseRunDetail = PulseRunListItem & {
  sections: PulseRunSection[];
  branchId: string | null;
  targetRoles: string[];
  targetDepartmentIds: string[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function newPublicToken(): string {
  return randomBytes(24).toString("base64url");
}

async function loadRunSections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
): Promise<PulseRunSection[]> {
  const { data: sections, error } = await supabase
    .from("pulse_survey_run_sections")
    .select("id, title, description, sort_order")
    .eq("run_id", runId)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const sectionIds = (sections ?? []).map((row) => row.id);
  if (sectionIds.length === 0) return [];

  const { data: questions, error: questionsError } = await supabase
    .from("pulse_survey_run_questions")
    .select("id, section_id, title, description, question_type, required, sort_order, rating_scale")
    .in("section_id", sectionIds)
    .order("sort_order");
  if (questionsError) throw new Error(questionsError.message);

  const questionIds = (questions ?? []).map((row) => row.id);
  const choicesByQuestion: Record<string, Array<{ id: string; label: string; sortOrder: number }>> = {};
  if (questionIds.length > 0) {
    const { data: choices, error: choicesError } = await supabase
      .from("pulse_survey_run_choices")
      .select("id, question_id, label, sort_order")
      .in("question_id", questionIds)
      .order("sort_order");
    if (choicesError) throw new Error(choicesError.message);
    for (const choice of choices ?? []) {
      const list = choicesByQuestion[choice.question_id] ?? [];
      list.push({ id: choice.id, label: choice.label, sortOrder: choice.sort_order });
      choicesByQuestion[choice.question_id] = list;
    }
  }

  const questionsBySection: Record<string, PulseRunQuestion[]> = {};
  for (const question of questions ?? []) {
    const list = questionsBySection[question.section_id] ?? [];
    list.push({
      id: question.id,
      sectionId: question.section_id,
      title: question.title,
      description: question.description,
      questionType: question.question_type as PulseQuestionType,
      required: question.required,
      sortOrder: question.sort_order,
      ratingScale: (question.rating_scale as PulseRatingScale | null) ?? null,
      choices: choicesByQuestion[question.id] ?? [],
    });
    questionsBySection[question.section_id] = list;
  }

  return (sections ?? []).map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    sortOrder: section.sort_order,
    questions: questionsBySection[section.id] ?? [],
  }));
}

async function snapshotTemplateOntoRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runId: string,
  templateId: string,
) {
  const template = await getPulseSurveyTemplateDetail(templateId);
  if (!template) throw new Error("Template not found.");
  if (!template.isActive) throw new Error("This template is inactive.");

  for (const [sIdx, section] of template.sections.entries()) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from("pulse_survey_run_sections")
      .insert({
        run_id: runId,
        title: section.title,
        description: section.description,
        sort_order: section.sortOrder ?? sIdx,
        source_section_id: section.id,
      })
      .select("id")
      .single();
    if (sectionError || !sectionRow) throw new Error(sectionError?.message ?? "Failed to copy section.");

    for (const [qIdx, question] of section.questions.entries()) {
      const { data: questionRow, error: questionError } = await supabase
        .from("pulse_survey_run_questions")
        .insert({
          section_id: sectionRow.id,
          title: question.title,
          description: question.description,
          question_type: question.questionType,
          required: question.required,
          sort_order: question.sortOrder ?? qIdx,
          rating_scale: question.ratingScale,
          source_question_id: question.id,
        })
        .select("id")
        .single();
      if (questionError || !questionRow) throw new Error(questionError?.message ?? "Failed to copy question.");

      if (question.choices.length > 0) {
        const { error: choicesError } = await supabase.from("pulse_survey_run_choices").insert(
          question.choices.map((choice, cIdx) => ({
            question_id: questionRow.id,
            label: choice.label,
            sort_order: choice.sortOrder ?? cIdx,
            source_choice_id: choice.id,
          })),
        );
        if (choicesError) throw new Error(choicesError.message);
      }
    }
  }

  return template.name;
}

async function freezeInvitations(input: {
  organizationId: string;
  runId: string;
  audience: {
    branchId: string | null;
    targetRoles: string[];
    targetDepartmentIds: string[];
  };
}) {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("organization_memberships")
    .select("user_id, roles, employee_id")
    .eq("organization_id", input.organizationId);
  if (error) throw new Error(error.message);

  const employeeIds = (memberships ?? [])
    .map((row) => row.employee_id)
    .filter((id): id is string => Boolean(id));

  if (employeeIds.length === 0) return 0;

  const { data: employees, error: employeesError } = await admin
    .from("employees")
    .select("id, branch_id, department_id, status")
    .eq("organization_id", input.organizationId)
    .in("id", employeeIds);
  if (employeesError) throw new Error(employeesError.message);

  const employeeMap = new Map(
    (employees ?? []).map((employee) => [
      employee.id as string,
      {
        branchId: (employee.branch_id as string | null) ?? null,
        departmentId: (employee.department_id as string | null) ?? null,
        status: employee.status as string,
      },
    ]),
  );

  const invites: Array<{
    organization_id: string;
    run_id: string;
    employee_id: string;
    user_id: string | null;
    branch_id: string | null;
    department_id: string | null;
  }> = [];

  for (const membership of memberships ?? []) {
    if (!membership.employee_id || !membership.user_id) continue;
    const employee = employeeMap.get(membership.employee_id);
    if (!employee || employee.status !== "active") continue;

    const matches = announcementMatchesAudience(input.audience, {
      branchId: employee.branchId,
      departmentId: employee.departmentId,
      roles: membership.roles ?? [],
    });
    if (!matches) continue;

    invites.push({
      organization_id: input.organizationId,
      run_id: input.runId,
      employee_id: membership.employee_id,
      user_id: membership.user_id,
      branch_id: employee.branchId,
      department_id: employee.departmentId,
    });
  }

  if (invites.length === 0) return 0;

  const { error: insertError } = await admin.from("pulse_survey_invitations").insert(invites);
  if (insertError) throw new Error(insertError.message);
  return invites.length;
}

export async function openPulseSurveyRun(
  rawInput: unknown,
  actorUserId?: string | null,
): Promise<string> {
  await requireRole("hr_administrator");
  const input = openPulseSurveyRunSchema.parse(rawInput) as OpenPulseSurveyRunInput;
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();
  const today = todayIso();

  const status =
    input.opensOn > today ? "scheduled" : input.closesOn < today ? "closed" : "open";

  const publicToken = input.publicLinkEnabled ? newPublicToken() : null;

  const { data: run, error } = await supabase
    .from("pulse_survey_runs")
    .insert({
      organization_id: organizationId,
      template_id: input.templateId,
      name: "Survey",
      status,
      opens_on: input.opensOn,
      closes_on: input.closesOn,
      branch_id: input.branchId || null,
      target_roles: input.targetRoles,
      target_department_ids: input.targetDepartmentIds,
      public_link_enabled: input.publicLinkEnabled,
      public_token: publicToken,
      created_by: actorUserId ?? null,
      closed_at: status === "closed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !run) throw new Error(error?.message ?? "Failed to open survey.");

  const name = await snapshotTemplateOntoRun(supabase, run.id, input.templateId);
  await supabase.from("pulse_survey_runs").update({ name }).eq("id", run.id);

  await freezeInvitations({
    organizationId,
    runId: run.id,
    audience: {
      branchId: input.branchId || null,
      targetRoles: input.targetRoles,
      targetDepartmentIds: input.targetDepartmentIds,
    },
  });

  if (status === "open") {
    const { queuePulseSurveyOpenedNotifications } = await import("@/lib/pulse/publish-notifications");
    await queuePulseSurveyOpenedNotifications({
      organizationId,
      runId: run.id,
      title: name,
      opensOn: input.opensOn,
    });
    await supabase
      .from("pulse_survey_runs")
      .update({ notifications_sent_at: new Date().toISOString() })
      .eq("id", run.id);
  }

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "pulse.survey_opened",
    resourceType: "pulse_survey_run",
    resourceId: run.id,
    metadata: { templateId: input.templateId, status },
  });

  return run.id;
}

export async function closePulseSurveyRun(runId: string, actorUserId?: string | null): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();
  const { error } = await supabase
    .from("pulse_survey_runs")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "pulse.survey_closed",
    resourceType: "pulse_survey_run",
    resourceId: runId,
    metadata: {},
  });
}

export async function setPulseSurveyPublicLink(runId: string, enabled: boolean): Promise<string | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data: run, error } = await supabase
    .from("pulse_survey_runs")
    .select("id, public_token")
    .eq("id", runId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!run) throw new Error("Survey not found.");

  const token = enabled ? run.public_token ?? newPublicToken() : null;
  const { error: updateError } = await supabase
    .from("pulse_survey_runs")
    .update({
      public_link_enabled: enabled,
      public_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("organization_id", organizationId);
  if (updateError) throw new Error(updateError.message);
  return token;
}

export async function listPulseSurveyRuns(): Promise<PulseRunListItem[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();
  const today = todayIso();

  const { data: runs, error } = await supabase
    .from("pulse_survey_runs")
    .select(
      "id, name, template_id, status, opens_on, closes_on, closed_at, public_link_enabled, public_token",
    )
    .eq("organization_id", organizationId)
    .order("opens_on", { ascending: false });
  if (error) throw new Error(error.message);

  const results: PulseRunListItem[] = [];
  for (const run of runs ?? []) {
    const derived = pulseRunStatus(run.opens_on, run.closes_on, today, run.closed_at);
    if (derived !== run.status && (derived === "open" || derived === "closed")) {
      await supabase
        .from("pulse_survey_runs")
        .update({
          status: derived,
          closed_at: derived === "closed" ? run.closed_at ?? new Date().toISOString() : null,
        })
        .eq("id", run.id);
    }

    const { count: invitedCount } = await supabase
      .from("pulse_survey_invitations")
      .select("id", { count: "exact", head: true })
      .eq("run_id", run.id);

    const { count: staffAnsweredCount } = await supabase
      .from("pulse_survey_responses")
      .select("id", { count: "exact", head: true })
      .eq("run_id", run.id)
      .eq("channel", "staff");

    const { count: linkAnsweredCount } = await supabase
      .from("pulse_survey_responses")
      .select("id", { count: "exact", head: true })
      .eq("run_id", run.id)
      .eq("channel", "link");

    results.push({
      id: run.id,
      name: run.name,
      templateId: run.template_id,
      status: derived,
      opensOn: run.opens_on,
      closesOn: run.closes_on,
      invitedCount: invitedCount ?? 0,
      staffAnsweredCount: staffAnsweredCount ?? 0,
      linkAnsweredCount: linkAnsweredCount ?? 0,
      publicLinkEnabled: run.public_link_enabled,
      publicToken: run.public_token,
    });
  }

  return results;
}

export async function getPulseSurveyRunDetail(runId: string): Promise<PulseRunDetail | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();
  const today = todayIso();

  const { data: run, error } = await supabase
    .from("pulse_survey_runs")
    .select(
      "id, name, template_id, status, opens_on, closes_on, closed_at, public_link_enabled, public_token, branch_id, target_roles, target_department_ids",
    )
    .eq("id", runId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!run) return null;

  const { count: invitedCount } = await supabase
    .from("pulse_survey_invitations")
    .select("id", { count: "exact", head: true })
    .eq("run_id", run.id);
  const { count: staffAnsweredCount } = await supabase
    .from("pulse_survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("run_id", run.id)
    .eq("channel", "staff");
  const { count: linkAnsweredCount } = await supabase
    .from("pulse_survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("run_id", run.id)
    .eq("channel", "link");

  return {
    id: run.id,
    name: run.name,
    templateId: run.template_id,
    status: pulseRunStatus(run.opens_on, run.closes_on, today, run.closed_at),
    opensOn: run.opens_on,
    closesOn: run.closes_on,
    invitedCount: invitedCount ?? 0,
    staffAnsweredCount: staffAnsweredCount ?? 0,
    linkAnsweredCount: linkAnsweredCount ?? 0,
    publicLinkEnabled: run.public_link_enabled,
    publicToken: run.public_token,
    branchId: run.branch_id,
    targetRoles: run.target_roles ?? [],
    targetDepartmentIds: run.target_department_ids ?? [],
    sections: await loadRunSections(supabase, run.id),
  };
}

function validateAnswersAgainstQuestions(
  sections: PulseRunSection[],
  answers: SubmitPulseSurveyInput["answers"],
) {
  const questions = sections.flatMap((section) => section.questions);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  for (const question of questions) {
    const answer = answerByQuestion.get(question.id);
    if (!answer) {
      if (question.required) throw new Error(`Answer required: ${question.title}`);
      continue;
    }

    if (question.questionType === "rating" || question.questionType === "enps") {
      if (answer.score == null) throw new Error(`Score required: ${question.title}`);
      const min = question.questionType === "enps" ? 0 : (question.ratingScale?.min ?? 1);
      const max = question.questionType === "enps" ? 10 : (question.ratingScale?.max ?? 5);
      if (answer.score < min || answer.score > max) {
        throw new Error(`Score out of range for: ${question.title}`);
      }
    } else if (question.questionType === "yes_no") {
      if (answer.booleanValue == null) throw new Error(`Yes/No required: ${question.title}`);
    } else if (question.questionType === "single_choice") {
      if (answer.choiceIds.length !== 1) throw new Error(`Pick one option: ${question.title}`);
      if (!question.choices.some((choice) => choice.id === answer.choiceIds[0])) {
        throw new Error(`Invalid option: ${question.title}`);
      }
    } else if (question.questionType === "multi_choice") {
      if (answer.choiceIds.length < 1) throw new Error(`Pick at least one option: ${question.title}`);
      for (const choiceId of answer.choiceIds) {
        if (!question.choices.some((choice) => choice.id === choiceId)) {
          throw new Error(`Invalid option: ${question.title}`);
        }
      }
    } else if (question.questionType === "short_text" || question.questionType === "long_text") {
      if (!answer.textValue?.trim()) throw new Error(`Text required: ${question.title}`);
    }
  }

  for (const answer of answers) {
    if (!byId.has(answer.questionId)) throw new Error("Unknown question in submission.");
  }
}

export async function submitStaffPulseSurvey(rawInput: unknown): Promise<void> {
  const input = submitPulseSurveySchema.parse(rawInput);
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = todayIso();

  const { data: invitation } = await supabase
    .from("pulse_survey_invitations")
    .select("id, run_id")
    .eq("run_id", input.runId)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!invitation) throw new Error("You were not invited to this survey.");

  const { data: run } = await supabase
    .from("pulse_survey_runs")
    .select("id, opens_on, closes_on, closed_at, status")
    .eq("id", input.runId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!run) throw new Error("Survey not found.");

  const status = pulseRunStatus(run.opens_on, run.closes_on, today, run.closed_at);
  if (status !== "open") throw new Error("This survey is not open.");

  const sections = await loadRunSections(supabase, input.runId);
  validateAnswersAgainstQuestions(sections, input.answers);

  const { data: response, error } = await supabase
    .from("pulse_survey_responses")
    .insert({
      organization_id: organizationId,
      run_id: input.runId,
      channel: "staff",
      employee_id: employeeId,
      invitation_id: invitation.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("You already answered this survey.");
    throw new Error(error.message);
  }

  const { error: answersError } = await supabase.from("pulse_survey_answers").insert(
    input.answers.map((answer) => ({
      response_id: response.id,
      question_id: answer.questionId,
      score: answer.score ?? null,
      text_value: answer.textValue ?? null,
      boolean_value: answer.booleanValue ?? null,
      choice_ids: answer.choiceIds ?? [],
    })),
  );
  if (answersError) throw new Error(answersError.message);
}

export async function listOpenPulseSurveysForEmployee() {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = todayIso();

  const { data: invitations, error } = await supabase
    .from("pulse_survey_invitations")
    .select("id, run_id")
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const runIds = (invitations ?? []).map((row) => row.run_id);
  if (runIds.length === 0) return [];

  const { data: runs, error: runsError } = await supabase
    .from("pulse_survey_runs")
    .select("id, name, opens_on, closes_on, closed_at, status")
    .in("id", runIds)
    .eq("organization_id", organizationId);
  if (runsError) throw new Error(runsError.message);

  const { data: responses } = await supabase
    .from("pulse_survey_responses")
    .select("run_id")
    .eq("employee_id", employeeId)
    .eq("channel", "staff")
    .in("run_id", runIds);

  const answered = new Set((responses ?? []).map((row) => row.run_id));

  const openRuns = [];
  for (const run of runs ?? []) {
    const status = pulseRunStatus(run.opens_on, run.closes_on, today, run.closed_at);
    if (status !== "open") continue;
    openRuns.push({
      id: run.id,
      name: run.name,
      opensOn: run.opens_on,
      closesOn: run.closes_on,
      alreadyAnswered: answered.has(run.id),
      sections: answered.has(run.id) ? [] : await loadRunSections(supabase, run.id),
    });
  }

  return openRuns;
}

export async function getPulseSurveyByPublicToken(token: string): Promise<{
  id: string;
  organizationId: string;
  name: string;
  status: "draft" | "scheduled" | "open" | "closed";
  sections: PulseRunSection[];
} | null> {
  const admin = createAdminClient();
  const today = todayIso();

  const { data: run, error } = await admin
    .from("pulse_survey_runs")
    .select("id, organization_id, name, opens_on, closes_on, closed_at, public_link_enabled, status")
    .eq("public_token", token)
    .eq("public_link_enabled", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!run) return null;

  const status = pulseRunStatus(run.opens_on, run.closes_on, today, run.closed_at);
  if (status !== "open") {
    return {
      id: run.id,
      organizationId: run.organization_id as string,
      name: run.name as string,
      status,
      sections: [],
    };
  }

  const sections = await loadRunSections(admin as unknown as Awaited<ReturnType<typeof createClient>>, run.id);
  return {
    id: run.id,
    organizationId: run.organization_id as string,
    name: run.name as string,
    status,
    sections,
  };
}

export async function submitPublicPulseSurvey(token: string, rawInput: unknown): Promise<void> {
  const answers = submitPulseSurveySchema.shape.answers.parse(
    (rawInput as { answers?: unknown })?.answers ?? rawInput,
  );

  const survey = await getPulseSurveyByPublicToken(token);
  if (!survey || survey.status !== "open") {
    throw new Error("This survey is not open.");
  }

  validateAnswersAgainstQuestions(survey.sections, answers);

  const admin = createAdminClient();
  const { data: response, error } = await admin
    .from("pulse_survey_responses")
    .insert({
      organization_id: survey.organizationId,
      run_id: survey.id,
      channel: "link",
      employee_id: null,
      invitation_id: null,
    })
    .select("id")
    .single();
  if (error || !response) throw new Error(error?.message ?? "Failed to save response.");

  const { error: answersError } = await admin.from("pulse_survey_answers").insert(
    answers.map((answer) => ({
      response_id: response.id,
      question_id: answer.questionId,
      score: answer.score ?? null,
      text_value: answer.textValue ?? null,
      boolean_value: answer.booleanValue ?? null,
      choice_ids: answer.choiceIds ?? [],
    })),
  );
  if (answersError) throw new Error(answersError.message);
}

/** Activate scheduled runs whose opens_on has arrived. */
export async function activateScheduledPulseSurveys(asOf = todayIso()): Promise<string[]> {
  const admin = createAdminClient();
  const { data: runs, error } = await admin
    .from("pulse_survey_runs")
    .select("id")
    .eq("status", "scheduled")
    .lte("opens_on", asOf)
    .gte("closes_on", asOf);
  if (error) throw new Error(error.message);

  const ids = (runs ?? []).map((row) => row.id as string);
  if (ids.length === 0) return [];

  const { error: updateError } = await admin
    .from("pulse_survey_runs")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .in("id", ids);
  if (updateError) throw new Error(updateError.message);
  return ids;
}

/** Close open runs past closes_on. */
export async function closeExpiredPulseSurveys(asOf = todayIso()): Promise<number> {
  const admin = createAdminClient();
  const { data: runs, error } = await admin
    .from("pulse_survey_runs")
    .select("id")
    .in("status", ["open", "scheduled"])
    .lt("closes_on", asOf);
  if (error) throw new Error(error.message);
  if (!runs?.length) return 0;

  const { error: updateError } = await admin
    .from("pulse_survey_runs")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in(
      "id",
      runs.map((row) => row.id),
    );
  if (updateError) throw new Error(updateError.message);
  return runs.length;
}
