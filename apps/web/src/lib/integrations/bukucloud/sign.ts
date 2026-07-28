import { createHmac } from "node:crypto";

export function signBukucloudRequest(input: {
  signingKey: string;
  method: string;
  pathWithQuery: string;
  body: string;
}): { timestamp: string; signature: string } {
  const timestamp = String(Date.now());
  const canonical = `${timestamp}.${input.method}.${input.pathWithQuery}.${input.body}`;
  const signature = createHmac("sha256", input.signingKey).update(canonical).digest("hex");
  return { timestamp, signature };
}
