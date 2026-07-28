import { NextResponse } from "next/server";

import { processWebhookOutbox } from "@/lib/audit/webhooks";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Deliver pending SIEM webhook payloads. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processWebhookOutbox(50);

  return NextResponse.json({ ok: true, ...result });
}
