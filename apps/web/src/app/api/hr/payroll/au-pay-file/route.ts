import { NextResponse } from "next/server";

import { generateAuPayFile } from "@/lib/payroll/exports/au-pay-file";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  let result;
  try {
    result = await generateAuPayFile(from, to);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the pay file.";
    return new NextResponse(message, { status: 400 });
  }

  if (!result) {
    return new NextResponse("Pay file is available for Australian organizations only.", {
      status: 404,
    });
  }

  return new NextResponse(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
    },
  });
}
