export function buildEmployeeActivationEmail({
  fullName,
  organizationName,
  activationLink,
}: {
  fullName: string;
  organizationName: string;
  activationLink: string;
}): { subject: string; html: string; text: string } {
  const subject = `Activate your ${organizationName} HRMS account`;

  const text = [
    `Hi ${fullName},`,
    "",
    `You've been added to ${organizationName} on HRMS.`,
    "Open the link below to set your password and activate your account:",
    "",
    activationLink,
    "",
    "If you didn't expect this email, contact your HR administrator.",
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #1b3a28; max-width: 560px;">
      <p>Hi ${fullName},</p>
      <p>You've been added to <strong>${organizationName}</strong> on HRMS.</p>
      <p>Open the button below to set your password and activate your account.</p>
      <p style="margin: 32px 0;">
        <a href="${activationLink}" style="background:#2d5e3a;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600;">
          Activate account
        </a>
      </p>
      <p style="font-size:13px;color:#7a8f7e;">If the button doesn't work, copy this link:<br>${activationLink}</p>
    </div>
  `.trim();

  return { subject, html, text };
}
