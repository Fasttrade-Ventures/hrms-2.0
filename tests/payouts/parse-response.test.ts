import { describe, expect, it } from "vitest";

import { parseCimbResponse, parseMaybankResponse } from "@/lib/payouts/parse-response";

describe("payout response parsers", () => {
  it("parses CIMB references", () => {
    const rows = parseCimbResponse("123,10000,Ali,PAY-2026-07-EMP001,SUCCESS");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reference).toBe("PAY-2026-07-EMP001");
    expect(rows[0]?.status).toBe("paid");
  });

  it("parses Maybank failures", () => {
    const rows = parseMaybankResponse("000000000001|Ali|10000|PAY-2026-07-EMP002|FAIL");
    expect(rows[0]?.status).toBe("failed");
  });
});
