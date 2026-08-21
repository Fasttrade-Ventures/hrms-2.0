export function buildDocumentComplianceEmail(input: {
  recipientName: string;
  employeeName: string;
  documentType: string;
  status: string;
  expiresAt?: string | null;
  audience: "employee" | "hr";
  remainingDays?: number | null;
}) {
  const statusLabel =
    input.status === "expiring"
      ? "expiring soon"
      : input.status === "expired"
        ? "expired"
        : "missing";

  let displayLabel = statusLabel;
  if (input.status === "expiring" && input.remainingDays !== undefined && input.remainingDays !== null) {
    displayLabel = `expires in ${input.remainingDays} days`;
  }

  const subject =
    input.status === "expiring" && input.remainingDays !== undefined && input.remainingDays !== null
      ? (input.audience === "hr"
          ? `${input.employeeName} — ${input.documentType} ${displayLabel}`
          : `Action needed: Your ${input.documentType.toLowerCase()} ${displayLabel}`)
      : (input.audience === "hr"
          ? `${input.employeeName} — ${input.documentType} is ${statusLabel}`
          : `Action needed: ${input.documentType} is ${statusLabel}`);

  const intro =
    input.audience === "hr"
      ? `A required document for ${input.employeeName} needs attention.`
      : `Hi ${input.recipientName}, your required document needs attention.`;

  const expiryLine = input.expiresAt ? `<p>Expiry date: <strong>${input.expiresAt}</strong></p>` : "";

  let docLine = "";
  let docLineText = "";

  if (input.status === "expiring" && input.remainingDays !== undefined && input.remainingDays !== null) {
    docLine = input.audience === "hr"
      ? `Their <strong>${input.documentType}</strong> ${displayLabel}.`
      : `Your <strong>${input.documentType}</strong> ${displayLabel}.`;
    docLineText = input.audience === "hr"
      ? `Their ${input.documentType} ${displayLabel}.`
      : `Your ${input.documentType} ${displayLabel}.`;
  } else {
    docLine = `<strong>${input.documentType}</strong> is currently <strong>${statusLabel}</strong>.`;
    docLineText = `${input.documentType} is ${statusLabel}.`;
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
      <p>${intro}</p>
      <p>${docLine}</p>
      ${expiryLine}
      <p>Please sign in to HRMS and upload or renew the document if required.</p>
    </div>
  `.trim();

  const text = [
    intro,
    docLineText,
    input.expiresAt ? `Expiry date: ${input.expiresAt}` : "",
    "Please sign in to HRMS and upload or renew the document if required.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
