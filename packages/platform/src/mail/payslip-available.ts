export function buildPayslipAvailableEmail(input: {
  periodLabel: string;
  payslipUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your payslip for ${input.periodLabel} is ready`;
  const text = `Your payslip for ${input.periodLabel} is now available.\n\nView payslip: ${input.payslipUrl}`;
  const html = `
    <p>Your payslip for <strong>${input.periodLabel}</strong> is now available.</p>
    <p><a href="${input.payslipUrl}">View payslip</a></p>
  `.trim();

  return { subject, html, text };
}
