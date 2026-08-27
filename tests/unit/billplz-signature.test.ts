import { describe, expect, it } from "vitest";

import {
  signBillplzPayload,
  verifyBillplzCallbackSignature,
} from "../../packages/platform/src/billing/billplz/signature";

describe("Billplz X Signature", () => {
  it("signs and verifies callback payloads", () => {
    const params = {
      id: "zq0tm2wc",
      collection_id: "yhx5t1pp",
      paid: "true",
      state: "paid",
      amount: "100",
      paid_amount: "100",
      due_at: "2018-9-27",
      mobile: "",
      name: "TESTER",
      url: "http://www.billplz-sandbox.com/bills/zq0tm2wc",
      paid_at: "2018-09-27 15:15:09 +0800",
    };
    const key = "test-x-signature-key";
    const signature = signBillplzPayload(params, key);

    expect(verifyBillplzCallbackSignature({ ...params, x_signature: signature }, key)).toBe(true);
  });

  it("rejects tampered payloads", () => {
    const params = {
      id: "zq0tm2wc",
      paid: "true",
      x_signature: "deadbeef",
    };
    expect(verifyBillplzCallbackSignature(params, "S-s7b4yWpp9h7rrkNM1i3Z_g")).toBe(false);
  });
});
