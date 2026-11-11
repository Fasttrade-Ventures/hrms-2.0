function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAnnouncementEmail(input: {
  title: string;
  message: string;
  announcementUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = input.title.trim() || "New announcement";
  const message = input.message.trim();
  const text = [subject, message, `Read it in BukuHR: ${input.announcementUrl}`]
    .filter(Boolean)
    .join("\n\n");

  const messageHtml = message
    ? `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`
    : "";

  const html = `
    <p><strong>${escapeHtml(subject)}</strong></p>
    ${messageHtml}
    <p><a href="${escapeHtml(input.announcementUrl)}">Read it in BukuHR</a></p>
  `.trim();

  return { subject, html, text };
}
