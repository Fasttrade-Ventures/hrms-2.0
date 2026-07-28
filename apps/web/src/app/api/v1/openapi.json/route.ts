import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "HRMS Enterprise API", version: "1.0.0" },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
        apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
    },
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    paths: {
      "/employees": { get: { summary: "List employees" } },
      "/employees/{id}": { get: { summary: "Get employee" } },
      "/leave-requests": { get: { summary: "List leave requests" } },
      "/payruns": { get: { summary: "List payruns" } },
      "/payruns/{id}": { get: { summary: "Get payrun" } },
      "/payruns/{id}/items": { get: { summary: "List payrun items" } },
    },
  });
}
