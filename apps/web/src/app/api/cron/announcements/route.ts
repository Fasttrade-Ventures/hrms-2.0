import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { runScheduledAnnouncementNotificationsJob } from "@/lib/announcements/jobs/publish-scheduled";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

/** Send deferred announcement notifications when display_from is reached. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const sent = await runScheduledAnnouncementNotificationsJob(asOf);
  const delivered = await processNotificationOutbox(100);

  return NextResponse.json({ ok: true, asOf, sent, delivered });
}
