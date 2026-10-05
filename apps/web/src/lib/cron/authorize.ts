import { timingSafeEqual } from "node:crypto";

/** Fail closed. A missing secret must not leave cron or health endpoints open. */
export function authorizeBearerSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actualBytes = Buffer.from(header);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

export function authorizeCron(request: Request): boolean {
  return authorizeBearerSecret(request, process.env.CRON_SECRET);
}
