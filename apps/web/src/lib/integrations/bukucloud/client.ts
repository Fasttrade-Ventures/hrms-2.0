import type { BukucloudConnectionConfig, BukucloudPayrollPayload, BukucloudPayrollResponse } from "./types";
import { signBukucloudRequest } from "./sign";

type BukucloudErrorBody = {
  error?: string;
  error_description?: string;
  message?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as BukucloudErrorBody;
    return body.error_description ?? body.message ?? body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function testBukucloudConnection(config: BukucloudConnectionConfig): Promise<void> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/api/v1/customers?per_page=1`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function postBukucloudPayroll(
  config: BukucloudConnectionConfig,
  payload: BukucloudPayrollPayload,
): Promise<BukucloudPayrollResponse> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const pathWithQuery = "/api/v1/payroll";
  const body = JSON.stringify(payload);
  const { timestamp, signature } = signBukucloudRequest({
    signingKey: config.signingKey,
    method: "POST",
    pathWithQuery,
    body,
  });

  const response = await fetch(`${baseUrl}${pathWithQuery}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-BukuCloud-Timestamp": timestamp,
      "X-BukuCloud-Signature": signature,
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as BukucloudPayrollResponse;
}
