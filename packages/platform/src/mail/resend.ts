import { buildEmployeeActivationEmail } from "./employee-activation";

type SendResult =
  | { sent: true; id?: string }
  | { sent: false; reason: "not_configured" | "request_failed"; detail?: string };

export async function sendEmployeeActivationEmail(input: {
  to: string;
  fullName: string;
  organizationName: string;
  activationLink: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const { subject, html, text } = buildEmployeeActivationEmail({
    fullName: input.fullName,
    organizationName: input.organizationName,
    activationLink: input.activationLink,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { sent: false, reason: "request_failed", detail };
  }

  const payload = (await response.json()) as { id?: string };
  return { sent: true, id: payload.id };
}
