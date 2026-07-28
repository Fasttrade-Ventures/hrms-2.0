import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(secret: string, body: string, timestamp: string): string {
  const canonical = `${timestamp}.${body}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function buildWebhookSignatureHeader(secret: string, body: string, timestamp: string): string {
  return `sha256=${signWebhookPayload(secret, body, timestamp)}`;
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  timestamp: string,
  signatureHeader: string,
): boolean {
  const expected = `sha256=${signWebhookPayload(secret, body, timestamp)}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function matchesEventFilter(eventType: string, filters: string[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((filter) => {
    if (filter.endsWith(".*")) {
      return eventType.startsWith(filter.slice(0, -1));
    }
    if (filter.endsWith("*")) {
      return eventType.startsWith(filter.slice(0, -1));
    }
    return eventType === filter;
  });
}
