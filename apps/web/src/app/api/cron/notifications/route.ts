import { NextResponse } from "next/server";

import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processNotificationOutbox();
  return NextResponse.json({ ok: true, ...result });
}
