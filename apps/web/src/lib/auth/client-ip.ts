import { headers } from "next/headers";

export function clientIpFromForwarded(forwardedFor: string | null, realIp: string | null): string {
  const hops = (forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return hops.at(-1) || realIp?.trim() || "unknown";
}

export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return clientIpFromForwarded(headerList.get("x-forwarded-for"), headerList.get("x-real-ip"));
}
