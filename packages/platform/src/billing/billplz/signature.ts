import { createHmac, timingSafeEqual } from "node:crypto";

function sourceStringForPair(key: string, value: string | undefined | null): string {
  if (value === undefined || value === null || value === "") {
    return key;
  }
  return `${key}${value}`;
}

/** Build Billplz X Signature source string (callback / redirect). */
export function buildBillplzSignatureSource(
  params: Record<string, string | undefined | null>,
  excludeKeys: string[] = ["x_signature"],
): string {
  const exclude = new Set(excludeKeys.map((key) => key.toLowerCase()));
  const segments = Object.entries(params)
    .filter(([key]) => !exclude.has(key.toLowerCase()))
    .map(([key, value]) => sourceStringForPair(key, value))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));

  return segments.join("|");
}

export function signBillplzPayload(
  params: Record<string, string | undefined | null>,
  xSignatureKey: string,
): string {
  const source = buildBillplzSignatureSource(params);
  return createHmac("sha256", xSignatureKey).update(source).digest("hex");
}

export function verifyBillplzCallbackSignature(
  params: Record<string, string | undefined | null>,
  xSignatureKey: string,
): boolean {
  const provided = params.x_signature?.trim();
  if (!provided) return false;

  const expected = signBillplzPayload(params, xSignatureKey);
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

/** Redirect URLs use nested `billplz[...]` keys. */
export function flattenBillplzRedirectParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    const match = /^billplz\[(.+)\]$/.exec(key);
    if (match) {
      flat[match[1]!] = value;
    }
  }
  return flat;
}
