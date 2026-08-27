import { NextResponse } from "next/server";
import { verifyBillplzCallbackSignature } from "@hrms/platform/billing/billplz/signature";

import { markInvoicePaidFromCallback } from "@/lib/billing/subscriptions";

function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of body.split("&")) {
    if (!part) continue;
    const eqIndex = part.indexOf("=");
    const rawKey = eqIndex === -1 ? part : part.slice(0, eqIndex);
    const rawValue = eqIndex === -1 ? "" : part.slice(eqIndex + 1);
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    params[key] = value;
  }
  return params;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = parseFormBody(rawBody);
  const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!xSignatureKey || !verifyBillplzCallbackSignature(payload, xSignatureKey)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (xSignatureKey && !verifyBillplzCallbackSignature(payload, xSignatureKey)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    await markInvoicePaidFromCallback(payload);
  } catch (error) {
    console.error("Billplz webhook error", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
