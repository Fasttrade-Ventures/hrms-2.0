import { processNotificationOutbox } from "@/lib/notifications/process-outbox";
import { queueNotification } from "@/lib/notifications/queue";
import { createAdminClient } from "@/lib/supabase/admin";

export async function queuePulseSurveyOpenedNotifications(input: {
  organizationId: string;
  runId: string;
  title: string;
  opensOn: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: invitations, error } = await admin
    .from("pulse_survey_invitations")
    .select("user_id")
    .eq("run_id", input.runId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);

  const userIds = [
    ...new Set(
      (invitations ?? [])
        .map((row) => row.user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (userIds.length === 0) return;

  const idempotencyBase = `pulse:${input.runId}:open:${input.opensOn}`;
  const href = "/employee/pulse";
  const message = `${input.title} is open. Answer once in BukuHR. Your name is not shown on the results.`;

  await Promise.all(
    userIds.flatMap((userId) => {
      const payload = {
        runId: input.runId,
        title: input.title,
        message,
        href,
      };
      return [
        queueNotification({
          organizationId: input.organizationId,
          recipientUserId: userId,
          channel: "in_app",
          template: "pulse.survey_opened",
          payload,
          idempotencyKey: `${idempotencyBase}:${userId}:in_app`,
        }),
        queueNotification({
          organizationId: input.organizationId,
          recipientUserId: userId,
          channel: "email",
          template: "pulse.survey_opened",
          payload,
          idempotencyKey: `${idempotencyBase}:${userId}:email`,
        }),
      ];
    }),
  );

  try {
    await processNotificationOutbox(500, "pulse.survey_opened");
  } catch (error) {
    console.error("Pulse survey email delivery failed:", error);
  }
}

export async function runScheduledPulseSurveyNotificationsJob(asOf: string): Promise<number> {
  const admin = createAdminClient();

  await import("@/lib/hr/pulse-survey-runs").then(async (mod) => {
    await mod.activateScheduledPulseSurveys(asOf);
    await mod.closeExpiredPulseSurveys(asOf);
  });

  const { data: runs, error } = await admin
    .from("pulse_survey_runs")
    .select("id, organization_id, name, opens_on, status, notifications_sent_at")
    .eq("status", "open")
    .is("notifications_sent_at", null)
    .lte("opens_on", asOf);

  if (error) throw new Error(error.message);

  let sent = 0;
  for (const run of runs ?? []) {
    await queuePulseSurveyOpenedNotifications({
      organizationId: run.organization_id,
      runId: run.id,
      title: run.name,
      opensOn: run.opens_on,
    });

    const { error: updateError } = await admin
      .from("pulse_survey_runs")
      .update({ notifications_sent_at: new Date().toISOString() })
      .eq("id", run.id);
    if (updateError) throw new Error(updateError.message);
    sent += 1;
  }

  return sent;
}
