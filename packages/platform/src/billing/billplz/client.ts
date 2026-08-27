import type { BillplzBill, BillplzCreateBillInput } from "./types";

export type BillplzClientConfig = {
  apiKey: string;
  apiBase?: string;
  fetchImpl?: typeof fetch;
};

function getApiBase(config: BillplzClientConfig): string {
  return (config.apiBase ?? process.env.BILLPLZ_API_BASE ?? "https://www.billplz.com/api").replace(
    /\/$/,
    "",
  );
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

export class BillplzClient {
  constructor(private readonly config: BillplzClientConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const response = await fetchImpl(`${getApiBase(this.config)}${path}`, {
      ...init,
      headers: {
        Authorization: authHeader(this.config.apiKey),
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const body = (await response.json().catch(() => null)) as T | { error?: string };
    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body && body.error
          ? String(body.error)
          : `Billplz request failed (${response.status})`;
      throw new Error(message);
    }

    return body as T;
  }

  async createBill(input: BillplzCreateBillInput): Promise<BillplzBill> {
    const form = new URLSearchParams();
    form.set("collection_id", input.collectionId);
    form.set("email", input.email);
    form.set("name", input.name);
    form.set("amount", String(input.amountSen));
    form.set("description", input.description.slice(0, 200));
    form.set("callback_url", input.callbackUrl);
    if (input.redirectUrl) form.set("redirect_url", input.redirectUrl);
    if (input.reference1) form.set("reference_1", input.reference1.slice(0, 120));
    if (input.reference1Label) form.set("reference_1_label", input.reference1Label.slice(0, 120));
    if (input.dueAt) form.set("due_at", input.dueAt);

    return this.request<BillplzBill>("/v3/bills", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  }

  async getBill(billId: string): Promise<BillplzBill> {
    return this.request<BillplzBill>(`/v3/bills/${encodeURIComponent(billId)}`);
  }
}

export function createBillplzClientFromEnv(fetchImpl?: typeof fetch): BillplzClient | null {
  const apiKey = process.env.BILLPLZ_API_KEY?.trim();
  if (!apiKey) return null;
  return new BillplzClient({ apiKey, fetchImpl });
}
