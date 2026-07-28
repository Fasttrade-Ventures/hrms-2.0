export type ParsedPayoutRow = {
  reference: string;
  status: "paid" | "failed";
  failureReason?: string;
};

export function parseMaybankResponse(content: string): ParsedPayoutRow[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const reference = parts[3]?.trim() ?? "";
      const statusFlag = (parts[4] ?? "OK").toUpperCase();
      const failed = statusFlag.includes("FAIL") || statusFlag.includes("REJECT");
      return {
        reference,
        status: (failed ? "failed" : "paid") as ParsedPayoutRow["status"],
        failureReason: failed ? statusFlag : undefined,
      };
    })
    .filter((row) => row.reference.startsWith("PAY-"));
}

export function parseCimbResponse(content: string): ParsedPayoutRow[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",");
      const reference = parts[3]?.trim() ?? "";
      const statusFlag = (parts[4] ?? "SUCCESS").toUpperCase();
      const failed = statusFlag.includes("FAIL") || statusFlag.includes("REJECT");
      return {
        reference,
        status: (failed ? "failed" : "paid") as ParsedPayoutRow["status"],
        failureReason: failed ? statusFlag : undefined,
      };
    })
    .filter((row) => row.reference.startsWith("PAY-"));
}

export function parseBankResponse(format: string, content: string): ParsedPayoutRow[] {
  if (format === "bank_maybank") return parseMaybankResponse(content);
  if (format === "bank_cimb") return parseCimbResponse(content);
  return parseCimbResponse(content);
}
