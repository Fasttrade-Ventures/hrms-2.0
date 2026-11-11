function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPulseSurveyOpenedEmail(input: {
  title: string;
  message: string;
  surveyUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = input.title.trim() || "Pulse survey";
  const message = input.message.trim();
  const text = [subject, message, `Open it in BukuHR: ${input.surveyUrl}`]
    .filter(Boolean)
    .join("\n\n");

  const messageHtml = message
    ? `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`
    : "";

  const html = `
    <p><strong>${escapeHtml(subject)}</strong></p>
    ${messageHtml}
    <p><a href="${escapeHtml(input.surveyUrl)}">Answer in BukuHR</a></p>
  `.trim();

  return { subject, html, text };
}
