export function buildScheduledReportEmail(input: {
  reportTitle: string;
  rowCount: number;
  reportUrl: string;
  schedule: string;
}): { subject: string; html: string; text: string } {
  const subject = `Scheduled report ready: ${input.reportTitle}`;
  const text = [
    `Your ${input.schedule} report "${input.reportTitle}" is ready.`,
    `${input.rowCount} row(s) matched the saved filters.`,
    `Open the report: ${input.reportUrl}`,
  ].join("\n");

  const html = `
    <p>Your <strong>${input.schedule}</strong> report <strong>${input.reportTitle}</strong> is ready.</p>
    <p>${input.rowCount} row(s) matched the saved filters.</p>
    <p><a href="${input.reportUrl}">Open report in HRMS</a></p>
  `.trim();

  return { subject, html, text };
}
