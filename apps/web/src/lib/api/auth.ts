import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api/keys";

export type ApiContext = {
  organizationId: string;
  keyId: string;
  scopes: string[];
};

export const API_SCOPES = [
  "employees:read",
  "leave:read",
  "payroll:read",
  "attendance:clock",
  "staff:self",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export function hasApiScope(scopes: string[] | null | undefined, scope: string): boolean {
  const granted = scopes ?? [];
  if (granted.includes(scope)) return true;
  if (granted.includes("staff:self") && scope === "attendance:clock") return true;
  return false;
}

export async function withApiAuth(
  request: Request,
  handler: (context: ApiContext) => Promise<NextResponse>,
  options?: { scope?: ApiScope },
): Promise<NextResponse> {
  const auth = await authenticateApiKey(
    request.headers.get("authorization"),
    request.headers.get("x-api-key"),
  );

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (options?.scope && !hasApiScope(auth.scopes, options.scope)) {
    return NextResponse.json({ error: "This API key cannot perform that action." }, { status: 403 });
  }

  return handler(auth);
}

export function parsePagination(url: URL): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
