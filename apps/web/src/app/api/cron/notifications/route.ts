import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processNotificationOutbox();
  return NextResponse.json({ ok: true, ...result });
}
