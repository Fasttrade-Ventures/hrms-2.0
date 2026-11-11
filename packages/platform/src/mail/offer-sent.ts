function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOfferSentEmail(input: {
  candidateName: string;
  organizationName: string;
  jobTitle: string;
  acceptUrl: string;
  rejectUrl: string;
  expiresInDays: number;
}): { subject: string; html: string; text: string } {
  const subject = `Your offer from ${input.organizationName}`;
  const text = [
    `Hi ${input.candidateName},`,
    "",
    `${input.organizationName} is pleased to offer you the position of ${input.jobTitle}.`,
    "Your offer letter is attached to this email.",
    "",
    `Accept the offer: ${input.acceptUrl}`,
    `Decline the offer: ${input.rejectUrl}`,
    "",
    `These links expire in ${input.expiresInDays} days and can be used once.`,
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #1b3a28; max-width: 560px;">
      <p>Hi ${escapeHtml(input.candidateName)},</p>
      <p><strong>${escapeHtml(input.organizationName)}</strong> is pleased to offer you the position of <strong>${escapeHtml(input.jobTitle)}</strong>.</p>
      <p>Your offer letter is attached to this email.</p>
      <p style="margin: 28px 0;">
        <a href="${escapeHtml(input.acceptUrl)}" style="background:#2d5e3a;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600;margin-right:8px;">Accept offer</a>
        <a href="${escapeHtml(input.rejectUrl)}" style="border:1px solid #2d5e3a;color:#2d5e3a;padding:11px 19px;text-decoration:none;font-weight:600;">Decline offer</a>
      </p>
      <p style="font-size:13px;color:#7a8f7e;">These links expire in ${input.expiresInDays} days and can be used once.</p>
    </div>
  `.trim();

  return { subject, html, text };
}

export function buildAgreementToSignEmail(input: {
  candidateName: string;
  organizationName: string;
  jobTitle: string;
  signUrl: string;
  expiresInDays: number;
  hasAttachment: boolean;
}): { subject: string; html: string; text: string } {
  const subject = `Sign your employment agreement — ${input.organizationName}`;
  const text = [
    `Hi ${input.candidateName},`,
    "",
    `Thank you for accepting the ${input.jobTitle} offer at ${input.organizationName}.`,
    input.hasAttachment
      ? "Your employment agreement is attached. Please sign it and upload the signed PDF using the link below."
      : "Open the link below to review your employment agreement and upload the signed copy.",
    "",
    input.signUrl,
    "",
    `This link expires in ${input.expiresInDays} days.`,
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #1b3a28; max-width: 560px;">
      <p>Hi ${escapeHtml(input.candidateName)},</p>
      <p>Thank you for accepting the <strong>${escapeHtml(input.jobTitle)}</strong> offer at <strong>${escapeHtml(input.organizationName)}</strong>.</p>
      <p>${
        input.hasAttachment
          ? "Your employment agreement is attached. Please sign it and upload the signed PDF using the button below."
          : "Open the button below to review your employment agreement and upload the signed copy."
      }</p>
      <p style="margin: 28px 0;">
        <a href="${escapeHtml(input.signUrl)}" style="background:#2d5e3a;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600;">Upload signed agreement</a>
      </p>
      <p style="font-size:13px;color:#7a8f7e;">This link expires in ${input.expiresInDays} days.</p>
    </div>
  `.trim();

  return { subject, html, text };
}
