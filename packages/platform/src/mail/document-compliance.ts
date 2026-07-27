export function buildDocumentComplianceEmail(input: {
  recipientName: string;
  employeeName: string;
  documentType: string;
  status: string;
  expiresAt?: string | null;
  audience: "employee" | "hr";
}) {
  const statusLabel =
    input.status === "expiring"
      ? "expiring soon"
      : input.status === "expired"
        ? "expired"
        : "missing";

  const subject =
    input.audience === "hr"
      ? `${input.employeeName} — ${input.documentType} is ${statusLabel}`
      : `Action needed: ${input.documentType} is ${statusLabel}`;

  const intro =
    input.audience === "hr"
      ? `A required document for ${input.employeeName} needs attention.`
      : `Hi ${input.recipientName}, your required document needs attention.`;

  const expiryLine = input.expiresAt ? `<p>Expiry date: <strong>${input.expiresAt}</strong></p>` : "";

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
      <p>${intro}</p>
      <p><strong>${input.documentType}</strong> is currently <strong>${statusLabel}</strong>.</p>
      ${expiryLine}
      <p>Please sign in to HRMS and upload or renew the document if required.</p>
    </div>
  `.trim();

  const text = [
    intro,
    `${input.documentType} is ${statusLabel}.`,
    input.expiresAt ? `Expiry date: ${input.expiresAt}` : "",
    "Please sign in to HRMS and upload or renew the document if required.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
