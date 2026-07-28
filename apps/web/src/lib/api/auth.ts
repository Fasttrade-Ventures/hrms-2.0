import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api/keys";

export type ApiContext = {
  organizationId: string;
  keyId: string;
};

export async function withApiAuth(
  request: Request,
  handler: (context: ApiContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const auth = await authenticateApiKey(
    request.headers.get("authorization"),
    request.headers.get("x-api-key"),
  );

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handler(auth);
}

export function parsePagination(url: URL): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
