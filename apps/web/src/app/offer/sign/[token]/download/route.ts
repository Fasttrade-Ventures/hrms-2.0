import { NextResponse } from "next/server";

import { resolveOfferTokenDownloadUrl } from "@/lib/recruitment/offer-candidate";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = await resolveOfferTokenDownloadUrl(token, "sign");
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(url);
}
